// ui.js - UI- und Rendering-Funktionen für LernApp

function showAlert(message, type = 'info') {
    const existingAlerts = document.querySelectorAll('.alert-global');
    existingAlerts.forEach(alert => alert.remove());
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-global fade-in`;
    alert.innerHTML = `
        <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'danger' ? 'x-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
        ${message}
    `;
    document.body.appendChild(alert);
    setTimeout(() => { alert.remove(); }, 3000);
}

function handleImageUpload(event, type) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById(`${type}-image-preview`);
    if (file) {
        if (!file.type.startsWith('image/')) {
            showAlert('Bitte wählen Sie eine gültige Bilddatei!', 'danger');
            event.target.value = '';
            previewContainer.innerHTML = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showAlert('Die Datei ist zu groß. Maximale Größe: 5MB', 'danger');
            event.target.value = '';
            previewContainer.innerHTML = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const description = type === 'shared' ? 'Wird bei der Frage angezeigt' : 'Wird als Antwort-Bild verwendet';
            previewContainer.innerHTML = `
                <div class="text-center">
                    <img src="${e.target.result}" alt="Bild Vorschau" class="img-thumbnail" style="max-width: 200px; max-height: 200px;">
                    <div class="mt-2">
                        <small class="text-success">
                            <i class="bi bi-check-circle"></i> ${description}
                        </small>
                        <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="removeImagePreview('${type}')">
                            <i class="bi bi-x"></i> Entfernen
                        </button>
                    </div>
                </div>
            `;
        };
        reader.readAsDataURL(file);
        showAlert('Bild erfolgreich ausgewählt!', 'success');
    } else {
        previewContainer.innerHTML = '';
    }
}

function removeImagePreview(type) {
    document.getElementById(`${type}-image-input`).value = '';
    document.getElementById(`${type}-image-preview`).innerHTML = '';
    showAlert('Bild entfernt', 'info');
}

window.showAlert = showAlert;
window.handleImageUpload = handleImageUpload;
window.removeImagePreview = removeImagePreview;
// ...weitere UI-Funktionen können hier ergänzt werden...
