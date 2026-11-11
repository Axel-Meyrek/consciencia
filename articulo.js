  // Barra de progreso de lectura
  (() => {
    const barra = document.getElementById('progreso');
    const texto = document.querySelector('.texto');
    let pendiente = false;
    const actualizar = () => {
      const r = texto.getBoundingClientRect();
      const total = r.height - innerHeight * .6;
      const avance = Math.min(1, Math.max(0, (innerHeight * .4 - r.top) / total));
      barra.style.transform = `scaleX(${avance})`;
      pendiente = false;
    };
    addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(actualizar); } }, { passive: true });
    addEventListener('resize', actualizar);
    actualizar();
  })();
