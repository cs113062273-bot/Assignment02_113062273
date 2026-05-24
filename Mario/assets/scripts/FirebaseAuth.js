const config = require('FirebaseConfig');

function encodeKey(value) {
    return encodeURIComponent(String(value || '').trim().toLowerCase());
}

function makeError(message) {
    const error = new Error(message);
    error.userMessage = message;
    return error;
}

function requestJson(url, options, behavior) {
    const settings = behavior || {};
    return fetch(url, options).then((response) => {
        return response.text().then((text) => {
            let json = null;
            if (text) {
                try {
                    json = JSON.parse(text);
                } catch (error) {
                    json = null;
                }
            }

            if (settings.allowNotFound && response.status === 404) {
                return null;
            }

            if (!response.ok) {
                const message = json && json.error && json.error.message ? json.error.message : response.statusText;
                throw makeError(message);
            }

            return json;
        });
    });
}

function mapAuthError(error) {
    const code = error && (error.userMessage || error.message || '');
    const table = {
        EMAIL_EXISTS: 'This email is already registered.',
        INVALID_EMAIL: 'Invalid email format.',
        WEAK_PASSWORD: 'Password must be at least 6 characters.',
        INVALID_PASSWORD: 'Wrong password.',
        EMAIL_NOT_FOUND: 'Account not found.',
        USER_DISABLED: 'This account has been disabled.',
        TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts. Please try again later.'
    };

    return table[code] || code || 'Authentication failed.';
}

class FirebaseAuth {
    constructor() {
        this.apiKey = config.apiKey;
        this.databaseURL = config.databaseURL ? config.databaseURL.replace(/\/+$/, '') : '';
        this.projectId = config.projectId || this.inferProjectId(this.databaseURL);
    }

    isConfigured() {
        return !!(this.apiKey && this.databaseURL);
    }

    ensureConfigured() {
        if (!this.isConfigured()) {
            throw makeError('FirebaseConfig.js is not filled yet.');
        }
    }

    ensureFirestoreConfigured() {
        this.ensureConfigured();
        if (!this.projectId) {
            throw makeError('Firebase projectId is missing.');
        }
    }

    inferProjectId(databaseURL) {
        const match = String(databaseURL || '').match(/^https:\/\/([^.]+)\.firebaseio\.com/i);
        if (!match) {
            return '';
        }

        return match[1].replace(/-default-rtdb$/i, '');
    }

    getIdentityUrl(path) {
        return `https://identitytoolkit.googleapis.com/v1/${path}?key=${this.apiKey}`;
    }

    getRefreshUrl() {
        return `https://securetoken.googleapis.com/v1/token?key=${this.apiKey}`;
    }

    getDbUrl(path, authToken) {
        const baseUrl = `${this.databaseURL}/${path}.json`;
        if (!authToken) {
            return baseUrl;
        }

        return `${baseUrl}?auth=${encodeURIComponent(authToken)}`;
    }

    getFirestoreUrl(path) {
        return `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/${path}`;
    }

    getProgressDocumentPath(uid) {
        return `marioProgress/${uid}`;
    }

    getLeaderboardDocumentPath(uid) {
        return `marioLeaderboard/${uid}`;
    }

    buildProgressState(state) {
        const source = state || {};
        return {
            lives: Math.max(0, Math.floor(Number(source.lives) || 0)),
            coins: Math.max(0, Math.floor(Number(source.coins) || 0)),
            score: Math.max(0, Math.floor(Number(source.score) || 0)),
            stage1Cleared: !!source.stage1Cleared
        };
    }

    buildProgressDocument(state) {
        const payload = this.buildProgressState(state);
        return {
            fields: {
                uid: {
                    stringValue: String((state && state.uid) || '')
                },
                username: {
                    stringValue: String((state && state.username) || 'UNKNOWN')
                },
                payload: {
                    stringValue: JSON.stringify(payload)
                },
                score: {
                    integerValue: String(payload.score)
                },
                updatedAt: {
                    timestampValue: new Date().toISOString()
                }
            }
        };
    }

    buildLeaderboardDocument(session, state) {
        const payload = this.buildProgressState(state);
        return {
            fields: {
                uid: {
                    stringValue: String((session && session.uid) || '')
                },
                username: {
                    stringValue: String((session && session.username) || 'UNKNOWN')
                },
                score: {
                    integerValue: String(payload.score)
                },
                updatedAt: {
                    timestampValue: new Date().toISOString()
                }
            }
        };
    }

    parseProgressDocument(document) {
        if (!document || !document.fields || !document.fields.payload) {
            return null;
        }

        const raw = document.fields.payload.stringValue;
        if (!raw) {
            return null;
        }

        try {
            return this.buildProgressState(JSON.parse(raw));
        } catch (error) {
            return null;
        }
    }

    parseIntegerField(fieldValue) {
        if (!fieldValue) {
            return 0;
        }

        if (typeof fieldValue.integerValue !== 'undefined') {
            return Math.max(0, Math.floor(Number(fieldValue.integerValue) || 0));
        }

        if (typeof fieldValue.doubleValue !== 'undefined') {
            return Math.max(0, Math.floor(Number(fieldValue.doubleValue) || 0));
        }

        return 0;
    }

    parseLeaderboardDocument(document) {
        const fields = document && document.fields ? document.fields : {};
        return {
            uid: fields.uid && fields.uid.stringValue ? fields.uid.stringValue : '',
            username: fields.username && fields.username.stringValue ? fields.username.stringValue : 'UNKNOWN',
            score: this.parseIntegerField(fields.score)
        };
    }

    refreshSession(session) {
        this.ensureConfigured();
        if (!session || !session.refreshToken) {
            return Promise.reject(makeError('Missing refresh token.'));
        }

        return requestJson(this.getRefreshUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(session.refreshToken)}`
        }).then((data) => {
            return {
                uid: data.user_id || session.uid,
                email: session.email,
                username: session.username,
                idToken: data.id_token || session.idToken,
                refreshToken: data.refresh_token || session.refreshToken
            };
        });
    }

    loadProgress(session) {
        this.ensureFirestoreConfigured();
        return this.refreshSession(session).then((freshSession) => {
            return requestJson(this.getFirestoreUrl(this.getProgressDocumentPath(freshSession.uid)), {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${freshSession.idToken}`
                }
            }, {
                allowNotFound: true
            }).then((document) => {
                return {
                    session: freshSession,
                    state: this.parseProgressDocument(document)
                };
            });
        });
    }

    saveProgress(session, state) {
        this.ensureFirestoreConfigured();
        return this.refreshSession(session).then((freshSession) => {
            const payload = Object.assign({}, state || {}, {
                uid: freshSession.uid,
                username: freshSession.username
            });
            return requestJson(this.getFirestoreUrl(this.getProgressDocumentPath(freshSession.uid)), {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${freshSession.idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.buildProgressDocument(payload))
            }).then(() => {
                return requestJson(this.getFirestoreUrl(this.getLeaderboardDocumentPath(freshSession.uid)), {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${freshSession.idToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.buildLeaderboardDocument(freshSession, payload))
                });
            }).then(() => {
                return freshSession;
            });
        });
    }

    clearProgress(session) {
        this.ensureFirestoreConfigured();
        return this.refreshSession(session).then((freshSession) => {
            return requestJson(this.getFirestoreUrl(this.getProgressDocumentPath(freshSession.uid)), {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${freshSession.idToken}`
                }
            }, {
                allowNotFound: true
            }).then(() => {
                return requestJson(this.getFirestoreUrl(this.getLeaderboardDocumentPath(freshSession.uid)), {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${freshSession.idToken}`
                    }
                }, {
                    allowNotFound: true
                });
            }).then(() => {
                return freshSession;
            });
        });
    }

    loadLeaderboard(session) {
        this.ensureFirestoreConfigured();
        return this.refreshSession(session).then((freshSession) => {
            const url = `${this.getFirestoreUrl('marioLeaderboard')}?pageSize=100`;
            return requestJson(url, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${freshSession.idToken}`
                }
            }).then((data) => {
                const documents = data && Array.isArray(data.documents) ? data.documents : [];
                const entries = documents
                    .map((document) => this.parseLeaderboardDocument(document))
                    .filter((entry) => entry && entry.username)
                    .sort((left, right) => {
                        if (right.score !== left.score) {
                            return right.score - left.score;
                        }

                        return String(left.username).localeCompare(String(right.username));
                    })
                    .slice(0, 3);

                return {
                    session: freshSession,
                    entries
                };
            });
        });
    }

    getUsernameRecord(username) {
        this.ensureConfigured();
        return requestJson(this.getDbUrl(`usernames/${encodeKey(username)}`), {
            method: 'GET'
        });
    }

    signUp(email, username, password) {
        this.ensureConfigured();

        const cleanEmail = String(email || '').trim();
        const cleanUsername = String(username || '').trim();
        const cleanPassword = String(password || '');

        if (!cleanEmail) {
            return Promise.reject(makeError('Email is required.'));
        }
        if (!cleanUsername) {
            return Promise.reject(makeError('Username is required.'));
        }
        if (!cleanPassword) {
            return Promise.reject(makeError('Password is required.'));
        }

        return this.getUsernameRecord(cleanUsername)
            .then((existingRecord) => {
                if (existingRecord) {
                    throw makeError('Username already exists.');
                }

                return requestJson(this.getIdentityUrl('accounts:signUp'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: cleanEmail,
                        password: cleanPassword,
                        returnSecureToken: true
                    })
                });
            })
            .then((authData) => {
                const usernameKey = encodeKey(cleanUsername);
                const profile = {
                    uid: authData.localId,
                    email: cleanEmail,
                    username: cleanUsername,
                    createdAt: new Date().toISOString()
                };

                return requestJson(this.getDbUrl(`usernames/${usernameKey}`, authData.idToken), {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        uid: authData.localId,
                        email: cleanEmail,
                        username: cleanUsername
                    })
                }).then(() => {
                    return requestJson(this.getDbUrl(`profiles/${authData.localId}`, authData.idToken), {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(profile)
                    }).then(() => {
                        return {
                            uid: authData.localId,
                            email: cleanEmail,
                            username: cleanUsername,
                            idToken: authData.idToken,
                            refreshToken: authData.refreshToken
                        };
                    });
                });
            })
            .catch((error) => {
                throw makeError(mapAuthError(error));
            });
    }

    login(username, password) {
        this.ensureConfigured();

        const cleanUsername = String(username || '').trim();
        const cleanPassword = String(password || '');

        if (!cleanUsername) {
            return Promise.reject(makeError('Username is required.'));
        }
        if (!cleanPassword) {
            return Promise.reject(makeError('Password is required.'));
        }

        return this.getUsernameRecord(cleanUsername)
            .then((record) => {
                if (!record || !record.email) {
                    throw makeError('Username not found.');
                }

                return requestJson(this.getIdentityUrl('accounts:signInWithPassword'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: record.email,
                        password: cleanPassword,
                        returnSecureToken: true
                    })
                }).then((authData) => {
                    return {
                        uid: authData.localId,
                        email: record.email,
                        username: record.username || cleanUsername,
                        idToken: authData.idToken,
                        refreshToken: authData.refreshToken
                    };
                });
            })
            .catch((error) => {
                throw makeError(mapAuthError(error));
            });
    }
}

module.exports = new FirebaseAuth();
