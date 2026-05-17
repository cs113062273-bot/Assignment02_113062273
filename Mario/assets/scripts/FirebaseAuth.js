const config = require('FirebaseConfig');

function encodeKey(value) {
    return encodeURIComponent(String(value || '').trim().toLowerCase());
}

function makeError(message) {
    const error = new Error(message);
    error.userMessage = message;
    return error;
}

function requestJson(url, options) {
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
    }

    isConfigured() {
        return !!(this.apiKey && this.databaseURL);
    }

    ensureConfigured() {
        if (!this.isConfigured()) {
            throw makeError('FirebaseConfig.js is not filled yet.');
        }
    }

    getIdentityUrl(path) {
        return `https://identitytoolkit.googleapis.com/v1/${path}?key=${this.apiKey}`;
    }

    getDbUrl(path, authToken) {
        const baseUrl = `${this.databaseURL}/${path}.json`;
        if (!authToken) {
            return baseUrl;
        }

        return `${baseUrl}?auth=${encodeURIComponent(authToken)}`;
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
