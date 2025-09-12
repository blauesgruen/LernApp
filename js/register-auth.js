// register-auth.js - Nur die Supabase-Registrierungsfunktion für register.html

window.register = async function(email, password, nickname) {
    try {
        const client = window.supabaseClient;
        if (!client || !client.auth) {
            window.showError('Supabase-Client nicht initialisiert!');
            return null;
        }
        // Vorab-Check: Existiert die E-Mail bereits?
        try {
            const { data: existingUsers, error: checkError } = await client
                .from('users')
                .select('email')
                .eq('email', email);
            if (checkError) {
                window.showError('Fehler beim E-Mail-Check: ' + checkError.message);
                return null;
            }
            if (Array.isArray(existingUsers) && existingUsers.length > 0) {
                window.showError('Diese E-Mail ist bereits registriert. Bitte loggen Sie sich ein oder nutzen Sie eine andere E-Mail-Adresse.');
                return null;
            }
        } catch (checkEx) {
            window.showError('Fehler beim Überprüfen der E-Mail.');
            return null;
        }
        // ...jetzt wie gehabt registrieren
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) {
            let msg = error.message || 'Registrierung fehlgeschlagen.';
            if (msg.toLowerCase().includes('already registered')) {
                msg = 'Diese E-Mail ist bereits registriert. Bitte loggen Sie sich ein oder nutzen Sie eine andere E-Mail-Adresse.';
            } else if (msg.toLowerCase().includes('invalid email')) {
                msg = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
            } else if (msg.toLowerCase().includes('password')) {
                msg = 'Das Passwort erfüllt nicht die Anforderungen. Bitte wählen Sie ein sicheres Passwort (mind. 6 Zeichen).';
            } else if (error.status === 0 || msg.toLowerCase().includes('network')) {
                msg = 'Server nicht erreichbar. Bitte versuchen Sie es später erneut.';
            }
            window.showError(msg);
            return null;
        }
        // Erfolg nur, wenn ein echtes User-Objekt mit id und passender E-Mail zurückgegeben wird
        const user = data?.user;
        if (!user || !user.id || !user.email || user.email.toLowerCase() !== email.toLowerCase()) {
            window.showError('Registrierung nicht möglich. Bitte prüfen Sie Ihre E-Mail oder versuchen Sie es später erneut.');
            return null;
        }
        // Nickname nach erfolgreichem SignUp speichern
        if (nickname) {
            await client.auth.updateUser({ data: { nickname } });
        }
        // Neutrale gelbe Meldung nach Registrierung
        if (window.notification && typeof window.notification.showNeutral === 'function') {
            window.notification.showNeutral('Bitte bestätigen Sie Ihre E-Mail-Adresse oder loggen Sie sich ein.');
        } else {
            // Fallback: gelbe Meldung per alert
            alert('Bitte bestätigen Sie Ihre E-Mail-Adresse oder loggen Sie sich ein.');
        }
        return user;
    } catch (error) {
        window.showError('Ein Fehler ist aufgetreten.');
        return null;
    }
};
