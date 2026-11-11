  // Código compartido por la portada y los artículos
  document.documentElement.classList.add('js');

  // Mira con coordenadas que sigue al cursor sobre las imágenes
  document.querySelectorAll('.card-img').forEach(img => {
    const mira = img.querySelector('.mira'); if (!mira) return;
    const lbl = mira.querySelector('span');
    img.addEventListener('pointermove', e => {
      const r = img.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      mira.style.setProperty('--mx', (x * 100) + '%');
      mira.style.setProperty('--my', (y * 100) + '%');
      lbl.textContent = `x ${x.toFixed(2)} · f(x) ${(1 - y).toFixed(2)}`;
      // si la etiqueta se saldría por la derecha o abajo, la pasa al otro lado
      lbl.style.transform = `translate(${x > .7 ? 'calc(-100% - 10px)' : '10px'}, ${y > .85 ? 'calc(-100% - 10px)' : '10px'})`;
    });
  });
