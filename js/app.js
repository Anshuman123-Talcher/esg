/**
 * MEIL Centralized ESG & BRSR Reporting Application Bootstrap
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log("Initializing MEIL Centralized ESG & BRSR Application...");
  
  // Route Guard: enforce authentication gate
  if (!auth.isAuthenticated()) {
    window.location.replace("login.html");
    return;
  }

  // Initialize UI & Router
  ui.init();

  // Handle ESC key to close open modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      ui.closeModals();
      const notifDrawer = document.getElementById('notification-drawer');
      if (notifDrawer) notifDrawer.classList.remove('open');
    }
  });

  console.log("MEIL ESG & BRSR Application loaded successfully. Active Role:", auth.getCurrentRole());
});
