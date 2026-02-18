const db = firebase.database();
const today = new Date().toISOString().split('T')[0]; // bijv. "2026-02-18"
const reservationsRef = db.ref('reservations/' + today);

const statusDiv = document.getElementById('status');
const seatInput = document.getElementById('seatInput');
const studentInput = document.getElementById('studentId');
const seatList = document.getElementById('seatList');

// Selecteer plaats via klik op plattegrond
function selectSeat(number) {
  seatInput.value = number;
  statusDiv.textContent = '';
  statusDiv.className = '';
}

// Real-time update van bezette plaatsen
reservationsRef.on('value', (snapshot) => {
  const reservations = snapshot.val() || {};
  seatList.innerHTML = '';

  Object.keys(reservations).forEach(seat => {
    const res = reservations[seat];
    const li = document.createElement('li');
    li.textContent = `Plaats ${seat} → bezet door student ${res.studentId}`;
    seatList.appendChild(li);
  });

  // Optioneel: kleur de image areas rood (geavanceerd, vereist SVG of overlay)
});

// Reserveer functie
function reserveSeat() {
  const seat = seatInput.value.trim();
  const studentId = studentInput.value.trim();

  if (!seat || !studentId) {
    showMessage('Vul zowel plaatsnummer als studentennummer in!', 'error');
    return;
  }

  if (isNaN(seat) || seat < 1) {
    showMessage('Ongeldig plaatsnummer!', 'error');
    return;
  }

  // Check of deze student al gereserveerd heeft vandaag
  reservationsRef.once('value')
    .then(snapshot => {
      const reservations = snapshot.val() || {};
      const alreadyReserved = Object.values(reservations).some(r => r.studentId === studentId);

      if (alreadyReserved) {
        showMessage('Je hebt al een plaats gereserveerd vandaag!', 'error');
        return;
      }

      // Check of plaats vrij is
      const seatRef = reservationsRef.child(seat);
      seatRef.once('value')
        .then(snap => {
          if (snap.exists()) {
            showMessage(`Plaats ${seat} is al bezet!`, 'error');
          } else {
            // Reserveer atomic (Firebase voorkomt race conditions)
            seatRef.set({
              studentId: studentId,
              reservedAt: new Date().toISOString()
            })
            .then(() => {
              showMessage(`Succes! Plaats ${seat} gereserveerd voor student ${studentId}.`, 'success');
              seatInput.value = '';
              studentInput.value = '';
            })
            .catch(err => {
              showMessage('Fout bij reserveren: ' + err.message, 'error');
            });
          }
        });
    })
    .catch(err => {
      showMessage('Verbinding met database mislukt: ' + err.message, 'error');
    });
}

// Helper voor berichten
function showMessage(text, type = '') {
  statusDiv.textContent = text;
  statusDiv.className = type; // error of success
}
