// Firebase Konfiguration und Initialisierung

// Import Firebase SDK Komponenten
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
    deleteUser,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    deleteDoc, 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs,
    serverTimestamp,
    enableNetwork,
    disableNetwork
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Firebase Konfiguration
const firebaseConfig = {
    // WICHTIG: Diese Werte müssen durch Ihre echten Firebase-Werte ersetzt werden
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "lernapp-demo.firebaseapp.com",
    projectId: "lernapp-demo",
    storageBucket: "lernapp-demo.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Offline-Unterstützung aktivieren
try {
    await enableNetwork(db);
} catch (error) {
    console.log('Offline-Modus aktiviert:', error);
}

class AuthService {
    constructor() {
        this.auth = auth;
        this.db = db;
        this.currentUser = null;
        this.isOffline = false;
        
        // Auth State Listener
        onAuthStateChanged(this.auth, (user) => {
            this.currentUser = user;
            this.handleAuthStateChange(user);
        });
        
        // Offline/Online Status überwachen
        window.addEventListener('online', () => {
            this.isOffline = false;
            this.syncOfflineData();
        });
        
        window.addEventListener('offline', () => {
            this.isOffline = true;
        });
    }

    // ==================== AUTHENTICATION ====================

    async register(email, password, displayName) {
        try {
            // Input Validierung
            if (!this.validateEmail(email)) {
                throw new Error('Ungültige E-Mail-Adresse');
            }
            
            if (!this.validatePassword(password)) {
                throw new Error('Passwort muss mindestens 8 Zeichen lang sein und Buchstaben sowie Zahlen enthalten');
            }
            
            if (!displayName || displayName.trim().length < 2) {
                throw new Error('Anzeigename muss mindestens 2 Zeichen lang sein');
            }

            // Benutzer erstellen
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;

            // Profil aktualisieren
            await updateProfile(user, {
                displayName: displayName.trim()
            });

            // Benutzer-Dokument in Firestore erstellen
            await this.createUserDocument(user, {
                displayName: displayName.trim(),
                email: email,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                settings: {
                    theme: 'light',
                    language: 'de',
                    notifications: true
                }
            });

            return {
                success: true,
                user: user,
                message: 'Registrierung erfolgreich!'
            };
            
        } catch (error) {
            console.error('Registrierung fehlgeschlagen:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async login(email, password) {
        try {
            // Input Validierung
            if (!this.validateEmail(email)) {
                throw new Error('Ungültige E-Mail-Adresse');
            }
            
            if (!password) {
                throw new Error('Passwort ist erforderlich');
            }

            // Anmeldung
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;

            // Letzten Login aktualisieren
            await this.updateUserDocument(user.uid, {
                lastLogin: serverTimestamp(),
                lastLoginIP: await this.getClientIP()
            });

            return {
                success: true,
                user: user,
                message: `Willkommen zurück, ${user.displayName || 'Benutzer'}!`
            };
            
        } catch (error) {
            console.error('Anmeldung fehlgeschlagen:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async logout() {
        try {
            await signOut(this.auth);
            
            // Lokale Daten löschen
            this.clearLocalData();
            
            return {
                success: true,
                message: 'Erfolgreich abgemeldet!'
            };
            
        } catch (error) {
            console.error('Abmeldung fehlgeschlagen:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async resetPassword(email) {
        try {
            if (!this.validateEmail(email)) {
                throw new Error('Ungültige E-Mail-Adresse');
            }

            await sendPasswordResetEmail(this.auth, email);
            
            return {
                success: true,
                message: 'Passwort-Reset-E-Mail wurde gesendet!'
            };
            
        } catch (error) {
            console.error('Passwort-Reset fehlgeschlagen:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async updateUserProfile(newDisplayName, currentPassword, newPassword) {
        try {
            if (!this.currentUser) {
                throw new Error('Benutzer nicht angemeldet');
            }

            // Display Name aktualisieren
            if (newDisplayName && newDisplayName.trim() !== this.currentUser.displayName) {
                await updateProfile(this.currentUser, {
                    displayName: newDisplayName.trim()
                });
                
                await this.updateUserDocument(this.currentUser.uid, {
                    displayName: newDisplayName.trim(),
                    updatedAt: serverTimestamp()
                });
            }

            // Passwort aktualisieren (falls angegeben)
            if (newPassword && currentPassword) {
                // Re-Authentifizierung erforderlich
                const credential = EmailAuthProvider.credential(
                    this.currentUser.email, 
                    currentPassword
                );
                
                await reauthenticateWithCredential(this.currentUser, credential);
                await updatePassword(this.currentUser, newPassword);
            }

            return {
                success: true,
                message: 'Profil erfolgreich aktualisiert!'
            };
            
        } catch (error) {
            console.error('Profil-Update fehlgeschlagen:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async deleteAccount(password) {
        try {
            if (!this.currentUser) {
                throw new Error('Benutzer nicht angemeldet');
            }

            // Re-Authentifizierung erforderlich
            const credential = EmailAuthProvider.credential(
                this.currentUser.email, 
                password
            );
            
            await reauthenticateWithCredential(this.currentUser, credential);

            // Benutzerdaten aus Firestore löschen
            await this.deleteUserData(this.currentUser.uid);

            // Benutzer-Account löschen
            await deleteUser(this.currentUser);

            return {
                success: true,
                message: 'Account erfolgreich gelöscht!'
            };
            
        } catch (error) {
            console.error('Account-Löschung fehlgeschlagen:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    // ==================== DATEN-SYNCHRONISATION ====================

    async saveUserData(userData) {
        try {
            if (!this.currentUser) {
                throw new Error('Benutzer nicht angemeldet');
            }

            // Daten validieren
            const validatedData = this.validateUserData(userData);

            // Online speichern
            if (!this.isOffline) {
                await this.updateUserDocument(this.currentUser.uid, {
                    userData: validatedData,
                    lastSyncAt: serverTimestamp()
                });
            }

            // Lokal speichern (Backup und Offline-Unterstützung)
            this.saveToLocalStorage('userData', validatedData);
            this.saveToLocalStorage('lastSync', Date.now());

            return {
                success: true,
                message: this.isOffline ? 'Daten lokal gespeichert (werden bei Online-Verbindung synchronisiert)' : 'Daten erfolgreich gespeichert!'
            };
            
        } catch (error) {
            console.error('Daten-Speicherung fehlgeschlagen:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async loadUserData() {
        try {
            if (!this.currentUser) {
                throw new Error('Benutzer nicht angemeldet');
            }

            let userData = null;

            // Versuche Online-Daten zu laden
            if (!this.isOffline) {
                try {
                    const userDoc = await getDoc(doc(this.db, 'users', this.currentUser.uid));
                    if (userDoc.exists()) {
                        userData = userDoc.data().userData || {};
                        
                        // Lokale Kopie aktualisieren
                        this.saveToLocalStorage('userData', userData);
                        this.saveToLocalStorage('lastSync', Date.now());
                    }
                } catch (error) {
                    console.warn('Online-Daten konnten nicht geladen werden, verwende lokale Daten:', error);
                }
            }

            // Fallback auf lokale Daten
            if (!userData) {
                userData = this.loadFromLocalStorage('userData') || this.getDefaultUserData();
            }

            return {
                success: true,
                data: userData,
                isOffline: this.isOffline
            };
            
        } catch (error) {
            console.error('Daten-Laden fehlgeschlagen:', error);
            return {
                success: false,
                error: this.getErrorMessage(error),
                data: this.getDefaultUserData()
            };
        }
    }

    async syncOfflineData() {
        try {
            if (this.isOffline || !this.currentUser) {
                return;
            }

            const localData = this.loadFromLocalStorage('userData');
            const lastSync = this.loadFromLocalStorage('lastSync');

            if (localData && lastSync) {
                // Prüfe ob lokale Daten neuer sind als letzte Sync
                const userDoc = await getDoc(doc(this.db, 'users', this.currentUser.uid));
                
                if (userDoc.exists()) {
                    const serverLastSync = userDoc.data().lastSyncAt?.toMillis() || 0;
                    
                    if (lastSync > serverLastSync) {
                        // Lokale Daten sind neuer, hochladen
                        await this.saveUserData(localData);
                        console.log('Offline-Daten erfolgreich synchronisiert');
                    }
                }
            }
            
        } catch (error) {
            console.error('Offline-Synchronisation fehlgeschlagen:', error);
        }
    }

    // ==================== TEILEN UND IMPORTIEREN ====================

    async shareData(shareData, expirationDays = 30) {
        try {
            if (!this.currentUser) {
                throw new Error('Benutzer nicht angemeldet');
            }

            // Share-Code generieren
            const shareCode = this.generateSecureShareCode();
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + expirationDays);

            // Geteilte Daten in Firestore speichern
            await setDoc(doc(this.db, 'sharedData', shareCode), {
                shareCode: shareCode,
                sharedBy: this.currentUser.uid,
                sharedByName: this.currentUser.displayName || 'Unbekannt',
                sharedByEmail: this.currentUser.email,
                data: shareData,
                createdAt: serverTimestamp(),
                expiresAt: expirationDate,
                downloadCount: 0,
                isActive: true
            });

            return {
                success: true,
                shareCode: shareCode,
                message: 'Daten erfolgreich geteilt!'
            };
            
        } catch (error) {
            console.error('Daten-Teilung fehlgeschlagen:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async importData(shareCode) {
        try {
            if (!shareCode || shareCode.length < 8) {
                throw new Error('Ungültiger Teilungs-Code');
            }

            // Geteilte Daten aus Firestore laden
            const shareDoc = await getDoc(doc(this.db, 'sharedData', shareCode.toUpperCase()));
            
            if (!shareDoc.exists()) {
                throw new Error('Teilungs-Code nicht gefunden');
            }

            const shareData = shareDoc.data();

            // Prüfe Gültigkeit
            if (!shareData.isActive) {
                throw new Error('Dieser Teilungs-Code ist nicht mehr aktiv');
            }

            if (shareData.expiresAt && shareData.expiresAt.toDate() < new Date()) {
                throw new Error('Dieser Teilungs-Code ist abgelaufen');
            }

            // Download-Zähler erhöhen
            await updateDoc(doc(this.db, 'sharedData', shareCode.toUpperCase()), {
                downloadCount: (shareData.downloadCount || 0) + 1,
                lastDownloadAt: serverTimestamp()
            });

            return {
                success: true,
                data: shareData.data,
                sharedBy: shareData.sharedByName,
                createdAt: shareData.createdAt?.toDate(),
                message: 'Daten erfolgreich importiert!'
            };
            
        } catch (error) {
            console.error('Daten-Import fehlgeschlagen:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async getMySharedData() {
        try {
            if (!this.currentUser) {
                throw new Error('Benutzer nicht angemeldet');
            }

            const q = query(
                collection(this.db, 'sharedData'),
                where('sharedBy', '==', this.currentUser.uid),
                where('isActive', '==', true),
                orderBy('createdAt', 'desc'),
                limit(50)
            );

            const querySnapshot = await getDocs(q);
            const sharedItems = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                sharedItems.push({
                    shareCode: data.shareCode,
                    createdAt: data.createdAt?.toDate(),
                    expiresAt: data.expiresAt,
                    downloadCount: data.downloadCount || 0,
                    dataSize: JSON.stringify(data.data).length
                });
            });

            return {
                success: true,
                data: sharedItems
            };
            
        } catch (error) {
            console.error('Geteilte Daten laden fehlgeschlagen:', error);
            return {
                success: false,
                error: this.getErrorMessage(error),
                data: []
            };
        }
    }

    async deleteSharedData(shareCode) {
        try {
            if (!this.currentUser) {
                throw new Error('Benutzer nicht angemeldet');
            }

            // Prüfe Berechtigung
            const shareDoc = await getDoc(doc(this.db, 'sharedData', shareCode));
            
            if (!shareDoc.exists()) {
                throw new Error('Teilungs-Code nicht gefunden');
            }

            const shareData = shareDoc.data();
            
            if (shareData.sharedBy !== this.currentUser.uid) {
                throw new Error('Keine Berechtigung zum Löschen');
            }

            // Deaktivieren statt löschen (für Audit-Trail)
            await updateDoc(doc(this.db, 'sharedData', shareCode), {
                isActive: false,
                deletedAt: serverTimestamp()
            });

            return {
                success: true,
                message: 'Geteilte Daten erfolgreich gelöscht!'
            };
            
        } catch (error) {
            console.error('Löschung geteilter Daten fehlgeschlagen:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    // ==================== HILFSFUNKTIONEN ====================

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePassword(password) {
        // Mindestens 8 Zeichen, mindestens 1 Buchstabe und 1 Zahl
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
        return passwordRegex.test(password);
    }

    validateUserData(userData) {
        // Datenstruktur validieren und säubern
        const validated = {
            categories: Array.isArray(userData.categories) ? userData.categories : [],
            questions: Array.isArray(userData.questions) ? userData.questions : [],
            statistics: typeof userData.statistics === 'object' ? userData.statistics : {},
            settings: typeof userData.settings === 'object' ? userData.settings : {}
        };

        // Fragen validieren
        validated.questions = validated.questions.filter(q => {
            return q && typeof q === 'object' && q.question && q.category;
        });

        return validated;
    }

    generateSecureShareCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 12; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    getDefaultUserData() {
        return {
            categories: ['Allgemein', 'Ordne zu'],
            questions: [],
            statistics: {
                totalQuestions: 0,
                correctAnswers: 0,
                categoriesPlayed: {},
                lastPlayed: null
            },
            settings: {
                theme: 'light',
                language: 'de',
                notifications: true
            }
        };
    }

    async createUserDocument(user, additionalData = {}) {
        const userRef = doc(this.db, 'users', user.uid);
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            userData: this.getDefaultUserData(),
            ...additionalData
        });
    }

    async updateUserDocument(uid, data) {
        const userRef = doc(this.db, 'users', uid);
        await updateDoc(userRef, data);
    }

    async deleteUserData(uid) {
        await deleteDoc(doc(this.db, 'users', uid));
    }

    handleAuthStateChange(user) {
        if (user) {
            console.log('Benutzer angemeldet:', user.displayName || user.email);
            
            // Offline-Daten synchronisieren
            setTimeout(() => this.syncOfflineData(), 1000);
        } else {
            console.log('Benutzer abgemeldet');
            this.clearLocalData();
        }
    }

    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(`lernapp_${key}`, JSON.stringify(data));
        } catch (error) {
            console.error('Lokaler Speicher Fehler:', error);
        }
    }

    loadFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(`lernapp_${key}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Lokaler Speicher Fehler:', error);
            return null;
        }
    }

    clearLocalData() {
        const keysToRemove = [
            'lernapp_userData',
            'lernapp_lastSync',
            'lernapp_cache'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
    }

    getErrorMessage(error) {
        const errorMessages = {
            'auth/user-not-found': 'Benutzer nicht gefunden',
            'auth/wrong-password': 'Falsches Passwort',
            'auth/email-already-in-use': 'E-Mail-Adresse bereits vergeben',
            'auth/weak-password': 'Passwort zu schwach',
            'auth/invalid-email': 'Ungültige E-Mail-Adresse',
            'auth/user-disabled': 'Benutzer-Account deaktiviert',
            'auth/too-many-requests': 'Zu viele Anfragen, bitte versuchen Sie es später erneut',
            'auth/network-request-failed': 'Netzwerkfehler, bitte prüfen Sie Ihre Internetverbindung',
            'auth/requires-recent-login': 'Für diese Aktion ist eine erneute Anmeldung erforderlich'
        };

        return errorMessages[error.code] || error.message || 'Ein unbekannter Fehler ist aufgetreten';
    }

    // Public getters
    get isAuthenticated() {
        return !!this.currentUser;
    }

    get user() {
        return this.currentUser;
    }

    get isOnline() {
        return !this.isOffline;
    }
}

// Auth Service exportieren
window.authService = new AuthService();
export default window.authService;
