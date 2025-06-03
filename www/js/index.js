document.addEventListener('deviceready', onDeviceReady, false);

var currentGroupCode = null;
var preceptorToken = null;
var userRole = null;

var firebaseConfig = {
    apiKey: "AIzaSyCTmds5U1TXMz2DZmxSFyiCO6Hz0W7I1n4",
    authDomain: "timbrerecreo-dcd8d.firebaseapp.com",
    projectId: "timbrerecreo-dcd8d",
    storageBucket: "timbrerecreo-dcd8d.appspot.com",
    messagingSenderId: "209787149178",
    appId: "1:209787149178:android:ff34e789162a06eb7214c3"
};

var app = firebase.initializeApp(firebaseConfig);
var db = firebase.firestore(app);

function onDeviceReady() {
    console.log('Capacitor listo');

    // Inicializar AdMob
    initAdMob();

    Capacitor.Plugins.FirebaseMessaging.getToken().then(function(result) {
        preceptorToken = result.token;
        console.log('Token del dispositivo:', preceptorToken);

        currentGroupCode = localStorage.getItem('groupCode');
        userRole = localStorage.getItem('userRole');
        console.log('Estado cargado - GroupCode:', currentGroupCode, 'Rol:', userRole);

        if (currentGroupCode && userRole) {
            db.collection('groups').doc(currentGroupCode).get().then(function(doc) {
                if (doc.exists) {
                    var members = doc.data().members || [];
                    if (members.includes(preceptorToken)) {
                        console.log('Grupo válido, actualizando membresía');
                        updateGroupMembership();
                    } else {
                        console.log('Token no en members, actualizando con nuevo token');
                        db.collection('groups').doc(currentGroupCode).update({
                            members: firebase.firestore.FieldValue.arrayUnion(preceptorToken)
                        }).then(function() {
                            console.log('Token añadido a members');
                            updateGroupMembership();
                        }).catch(function(error) {
                            console.error('Error actualizando members:', error);
                            alert('Error al restaurar grupo: ' + error.message);
                            clearLocalStorage();
                            updateUI();
                        });
                    }
                } else {
                    console.log('Grupo no existe en Firestore, limpiando estado');
                    clearLocalStorage();
                    updateUI();
                }
            }).catch(function(error) {
                console.error('Error verificando grupo:', error);
                alert('Error al verificar grupo: ' + error.message);
                clearLocalStorage();
                updateUI();
            });
        } else {
            console.log('Sin estado guardado, mostrando initialUI');
            updateUI();
        }
    }).catch(function(err) {
        console.error('Error al obtener token:', err);
        clearLocalStorage();
        updateUI();
    });

    Capacitor.Plugins.PushNotifications.requestPermissions().then(function(result) {
        console.log('Resultado de permisos:', result);
        if (result.receive !== 'granted') {
            console.error('Permisos denegados');
            alert('Habilita las notificaciones en ajustes');
        } else {
            Capacitor.Plugins.PushNotifications.register();
        }
    }).catch(function(err) {
        console.error('Error solicitando permisos:', err);
    });

    Capacitor.Plugins.PushNotifications.addListener('registration', function(token) {
        console.log('Registro exitoso, token:', token.value);
    });

    Capacitor.Plugins.PushNotifications.addListener('registrationError', function(error) {
        console.error('Error de registro:', error);
    });

    Capacitor.Plugins.PushNotifications.addListener('pushNotificationReceived', function(notification) {
        console.log('Notificación recibida:', JSON.stringify(notification));
        playTimbre();
    });

    Capacitor.Plugins.PushNotifications.addListener('pushNotificationActionPerformed', function(action) {
        console.log('Notificación tocada:', JSON.stringify(action));
        playTimbre();
    });

    console.log('Listeners configurados');
}

function initAdMob() {
    if (window.admob) {
        // Configurar banner
        admob.banner.config({
            id: 'ca-app-pub-4946085342484331/3987464970', // Reemplaza con tu ID de banner de producción
            isTesting: false,
            autoShow: true,
            position: 'bottom'
        });
        admob.banner.prepare().then(() => {
            console.log('Banner preparado con éxito');
            admob.banner.show().then(() => {
                console.log('Banner mostrado con éxito');
            }).catch(err => {
                console.error('Error mostrando banner:', err);
            });
        }).catch(err => {
            console.error('Error preparando banner:', err);
        });

        // Configurar intersticial
        admob.interstitial.config({
            id: 'ca-app-pub-4946085342484331/2302239400', // Reemplaza con tu ID de intersticial de producción
            isTesting: false
        });
        admob.interstitial.prepare().then(() => {
            console.log('Intersticial preparado con éxito');
        }).catch(err => {
            console.error('Error preparando intersticial:', err);
        });
    } else {
        console.log('AdMob no está disponible');
    }
}

function showInterstitialAd() {
    if (window.admob) {
        admob.interstitial.show().then(() => {
            console.log('Intersticial mostrado con éxito');
            // Preparar el siguiente intersticial
            admob.interstitial.prepare();
        }).catch(err => {
            console.error('Error mostrando intersticial:', err);
        });
    }
}

function updateGroupMembership() {
    if (userRole === 'preceptor') {
        db.collection('groups').doc(currentGroupCode).set({
            name: localStorage.getItem('groupName'),
            members: firebase.firestore.FieldValue.arrayUnion(preceptorToken),
            activado: false,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(function() {
            updateUI();
        }).catch(function(error) {
            console.error('Error actualizando membresía:', error);
            clearLocalStorage();
            updateUI();
        });
    } else if (userRole === 'profesor') {
        db.collection('groups').doc(currentGroupCode).update({
            members: firebase.firestore.FieldValue.arrayUnion(preceptorToken)
        }).then(function() {
            showInterstitialAd(); // Mostrar intersticial al unirse como profesor
            updateUI();
        }).catch(function(error) {
            console.error('Error actualizando membresía:', error);
            clearLocalStorage();
            updateUI();
        });
    }
}

function updateUI() {
    var preceptorUI = document.getElementById('preceptorUI');
    var profesorUI = document.getElementById('profesorUI');
    var initialUI = document.getElementById('initialUI');

    if (currentGroupCode && userRole === 'preceptor') {
        initialUI.style.display = 'none';
        profesorUI.style.display = 'none';
        preceptorUI.style.display = 'block';
        document.getElementById('groupCodeDisplay').innerText = 'Código: ' + currentGroupCode;
    } else if (currentGroupCode && userRole === 'profesor') {
        initialUI.style.display = 'none';
        preceptorUI.style.display = 'none';
        profesorUI.style.display = 'block';
        document.getElementById('statusMessage').innerText = 'En espera de la notificación del preceptor';
    } else {
        initialUI.style.display = 'block';
        preceptorUI.style.display = 'none';
        profesorUI.style.display = 'none';
    }
}

function showPrivacyPolicy() {
    window.open('https://sites.google.com/view/timbre-de-recreo', '_system');
}

function createGroup() {
    var groupName = document.getElementById('groupNameInput').value;
    if (!groupName) {
        alert('Ingresa un nombre para el grupo');
        return;
    }

    currentGroupCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    db.collection('groups').doc(currentGroupCode).set({
        name: groupName,
        members: [preceptorToken],
        activado: false,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
        localStorage.setItem('groupCode', currentGroupCode);
        localStorage.setItem('groupName', groupName);
        userRole = 'preceptor';
        localStorage.setItem('userRole', userRole);
        showInterstitialAd(); // Mostrar intersticial al crear grupo
        updateUI();
    }).catch(function(error) {
        console.error('Error creando grupo:', error);
        alert('Error al crear grupo: ' + error.message);
    });
}

function joinGroup() {
    currentGroupCode = document.getElementById('groupCodeInput').value.toUpperCase();
    if (!currentGroupCode) {
        alert('Ingresa un código de grupo');
        return;
    }

    db.collection('groups').doc(currentGroupCode).get().then(function(doc) {
        if (doc.exists) {
            db.collection('groups').doc(currentGroupCode).update({
                members: firebase.firestore.FieldValue.arrayUnion(preceptorToken)
            }).then(function() {
                userRole = 'profesor';
                localStorage.setItem('groupCode', currentGroupCode);
                localStorage.setItem('userRole', userRole);
                showInterstitialAd(); // Mostrar intersticial al unirse
                updateUI();
            }).catch(function(error) {
                console.error('Error actualizando grupo:', error);
                alert('Error al unirse al grupo: ' + error.message);
            });
        } else {
            alert('Código de grupo no válido');
        }
    }).catch(function(error) {
        console.error('Error verificando grupo:', error);
        alert('Error al verificar grupo: ' + error.message);
    });
}

function leaveGroup() {
    if (!currentGroupCode || !userRole || !preceptorToken) {
        console.error('No estás en un grupo o falta token', { currentGroupCode, userRole, preceptorToken });
        alert('No estás en un grupo');
        clearLocalStorage();
        updateUI();
        return;
    }

    db.collection('groups').doc(currentGroupCode).get().then(function(doc) {
        if (!doc.exists) {
            console.error('Grupo no encontrado:', currentGroupCode);
            alert('El grupo no existe');
            clearLocalStorage();
            updateUI();
            return;
        }

        var members = doc.data().members || [];
        if (!members.includes(preceptorToken)) {
            console.error('Token no está en members:', preceptorToken, members);
            alert('No eres miembro de este grupo');
            clearLocalStorage();
            updateUI();
            return;
        }

        db.collection('groups').doc(currentGroupCode).update({
            members: firebase.firestore.FieldValue.arrayRemove(preceptorToken)
        }).then(function() {
            console.log('Salió del grupo:', currentGroupCode);
            alert('Has salido del grupo');
            clearLocalStorage();
            updateUI();
        }).catch(function(error) {
            console.error('Error saliendo del grupo:', error);
            alert('Error al salir del grupo: ' + error.message);
        });
    }).catch(function(error) {
        console.error('Error verificando grupo:', error);
        alert('Error al verificar el grupo: ' + error.message);
    });
}

function clearLocalStorage() {
    localStorage.removeItem('groupCode');
    localStorage.removeItem('userRole');
    localStorage.removeItem('groupName');
    currentGroupCode = null;
    userRole = null;
}

function ringBell() {
    console.log('Botón Activar timbre tocado');
    document.getElementById('timbreBtnImg').style.display = 'none';
    document.getElementById('timbreVideo').style.display = 'block';
    document.getElementById('timbreVideo').play();

    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://us-central1-timbrerecreo-dcd8d.cloudfunctions.net/ringBell');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        if (xhr.status === 200) {
            alert('Respuesta del servidor: ' + xhr.responseText);
            playTimbre();
        } else {
            alert('Error al activar el timbre: ' + xhr.status);
        }
        document.getElementById('timbreVideo').style.display = 'none';
        document.getElementById('timbreBtnImg').style.display = 'block';
    };
    xhr.send(JSON.stringify({ groupCode: currentGroupCode }));
}

function playTimbre() {
    console.log('Intentando reproducir timbre');
    var audio = new Audio('media/timbre.mp3');
    audio.play()
        .then(() => console.log('Timbre reproducido con éxito'))
        .catch(err => {
            console.error('Error al reproducir timbre:', err);
            alert('Error al reproducir: ' + err.message);
        });
}

function testBell() {
    console.log('Botón Probar timbre tocado');
    playTimbre();
}