document.addEventListener('DOMContentLoaded', () => {

  // --- Supabase Config & Fallback Setup ---
  // Reemplazar con tus credenciales reales de Supabase:
  const SUPABASE_URL = ""; 
  const SUPABASE_ANON_KEY = "";
  
  let supabase = null;
  if (SUPABASE_URL && SUPABASE_ANON_KEY && typeof window.supabase !== 'undefined') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // --- Navbar scroll effect ---
  const navbar = document.querySelector('.navbar');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 80);
  }, { passive: true });


  // --- Mobile menu toggle ---
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
  }


  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;

      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });


  // --- Scroll reveal ---
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


  // --- Active nav highlight ---
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.nav-links a');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navItems.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { threshold: 0.3, rootMargin: '-80px 0px 0px 0px' });

  sections.forEach(section => sectionObserver.observe(section));


  // --- Back to top button ---
  const backToTop = document.querySelector('.back-to-top');

  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 600);
    }, { passive: true });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }


  // --- Form handling ---
  const form = document.querySelector('.contact-form');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;

      btn.textContent = '¡Enviado!';
      btn.disabled = true;

      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
        form.reset();
      }, 3000);
    });
  }

  // --- ONLINE BOOKING SYSTEM LOGIC ---
  const bookingForm = document.getElementById('booking-form');
  const bookDate = document.getElementById('book-date');
  const bookTime = document.getElementById('book-time');
  const bookBarber = document.getElementById('book-barber');
  const bookService = document.getElementById('book-service');
  const bookingSummary = document.getElementById('booking-summary');
  const summaryText = document.getElementById('summary-text');
  
  const btnAdminToggle = document.getElementById('btn-admin-toggle');
  const adminPanel = document.getElementById('admin-panel');
  const appointmentsList = document.getElementById('appointments-list');

  // Prevent selecting past dates
  if (bookDate) {
    const today = new Date().toISOString().split('T')[0];
    bookDate.min = today;
  }

  // Dynamic time slots generation (9-13 and 17-22)
  const generateTimeSlots = (dateStr) => {
    const slots = [];
    const morningStart = 9;
    const morningEnd = 13;
    const afternoonStart = 17;
    const afternoonEnd = 22;

    // Morning slots (every 30 mins)
    for (let hour = morningStart; hour < morningEnd; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    // Afternoon slots (every 30 mins)
    for (let hour = afternoonStart; hour < afternoonEnd; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }

    return slots;
  };

  // Populate time slots when date changes
  if (bookDate && bookTime) {
    bookDate.addEventListener('change', async () => {
      const selectedDate = bookDate.value;
      if (!selectedDate) return;

      const slots = generateTimeSlots(selectedDate);
      const selectedBarber = bookBarber.value;
      
      let appointments = [];
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('barber_appointments')
            .select('*')
            .eq('date', selectedDate);
          
          if (!error && data) {
            appointments = data;
          }
        } catch (err) {
          console.error("Error fetching from Supabase, using LocalStorage fallback", err);
          appointments = JSON.parse(localStorage.getItem('barber_appointments') || '[]');
        }
      } else {
        appointments = JSON.parse(localStorage.getItem('barber_appointments') || '[]');
      }

      // Filter slots already taken
      bookTime.innerHTML = '<option value="" disabled selected>Seleccioná un horario</option>';
      
      slots.forEach(slot => {
        const isTaken = appointments.some(appt => 
          appt.date === selectedDate && 
          appt.time === slot && 
          (selectedBarber === 'Cualquiera' || appt.barber === selectedBarber || appt.barber === 'Cualquiera')
        );

        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot + (isTaken ? ' (Ocupado)' : '');
        if (isTaken) {
          option.disabled = true;
        }
        bookTime.appendChild(option);
      });

      bookTime.disabled = false;
    });

    bookBarber.addEventListener('change', () => {
      // Trigger recalculation of available time slots
      bookDate.dispatchEvent(new Event('change'));
    });
  }

  // Update live booking summary info
  const updateSummary = () => {
    if (!bookService.value || !bookDate.value || !bookTime.value) {
      bookingSummary.style.display = 'none';
      return;
    }
    const service = bookService.value;
    const barber = bookBarber.value;
    const date = bookDate.value;
    const time = bookTime.value;
    
    summaryText.innerHTML = `💇‍♂️ <strong>${service}</strong> con <strong>${barber}</strong><br>📅 El día <strong>${date}</strong> a las <strong>${time} hs</strong>.`;
    bookingSummary.style.display = 'block';
  };

  [bookService, bookBarber, bookDate, bookTime].forEach(el => {
    if (el) el.addEventListener('change', updateSummary);
  });

  // Handle Turn Submission
  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const newAppt = {
        service: bookService.value,
        barber: bookBarber.value === 'Cualquiera' ? (Math.random() > 0.5 ? 'Cristian Levio (Mele)' : 'Blas Levio (Tato)') : bookBarber.value,
        date: bookDate.value,
        time: bookTime.value,
        name: document.getElementById('book-name').value,
        phone: document.getElementById('book-phone').value
      };

      if (supabase) {
        try {
          const { error } = await supabase
            .from('barber_appointments')
            .insert([newAppt]);
          if (error) throw error;
        } catch (err) {
          console.error("Error saving to Supabase, falling back to LocalStorage", err);
          const appointments = JSON.parse(localStorage.getItem('barber_appointments') || '[]');
          newAppt.id = Date.now().toString();
          appointments.push(newAppt);
          localStorage.setItem('barber_appointments', JSON.stringify(appointments));
        }
      } else {
        const appointments = JSON.parse(localStorage.getItem('barber_appointments') || '[]');
        newAppt.id = Date.now().toString();
        appointments.push(newAppt);
        localStorage.setItem('barber_appointments', JSON.stringify(appointments));
      }

      // Visual Success Feedback
      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      const origText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span>¡Turno Reservado con Éxito! ✓</span>';
      submitBtn.style.background = '#2e7d32';
      submitBtn.disabled = true;

      setTimeout(() => {
        submitBtn.innerHTML = origText;
        submitBtn.style.background = '';
        submitBtn.disabled = false;
        bookingForm.reset();
        bookTime.disabled = true;
        bookTime.innerHTML = '<option value="" disabled selected>Elegí una fecha primero</option>';
        bookingSummary.style.display = 'none';
        
        // Refresh admin dashboard list if visible
        renderAppointments();
      }, 3000);
    });
  }

  // --- BARBER ADMIN DASHBOARD ---
  if (btnAdminToggle && adminPanel) {
    btnAdminToggle.addEventListener('click', () => {
      const isHidden = adminPanel.style.display === 'none';
      
      if (isHidden) {
        const password = prompt('Por favor, ingresá la contraseña de barbero:');
        if (password === 'imperio18') {
          adminPanel.style.display = 'block';
          renderAppointments();
        } else if (password !== null) {
          alert('Contraseña incorrecta. Acceso denegado.');
        }
      } else {
        adminPanel.style.display = 'none';
      }
    });
  }

  // Filter functionality
  let currentFilter = 'Todos';
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.barber;
      renderAppointments();
    });
  });

  const renderAppointments = async () => {
    if (!appointmentsList) return;
    
    let appointments = [];
    
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('barber_appointments')
          .select('*');
        if (!error && data) {
          appointments = data;
        }
      } catch (err) {
        console.error("Error reading from Supabase, using LocalStorage", err);
        appointments = JSON.parse(localStorage.getItem('barber_appointments') || '[]');
      }
    } else {
      appointments = JSON.parse(localStorage.getItem('barber_appointments') || '[]');
    }

    // Sort appointments chronologically by date and time
    appointments.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

    // Filter appointments
    const filtered = appointments.filter(appt => {
      if (currentFilter === 'Todos') return true;
      return appt.barber === currentFilter;
    });

    if (filtered.length === 0) {
      appointmentsList.innerHTML = '<p class="no-appts">No hay turnos agendados para este barbero.</p>';
      return;
    }

    appointmentsList.innerHTML = '';
    filtered.forEach(appt => {
      const card = document.createElement('div');
      card.className = 'appt-card';
      const keyId = appt.id ? appt.id : `${appt.date}-${appt.time}-${appt.name}`;
      card.innerHTML = `
        <div class="appt-info">
          <h4>${appt.name}</h4>
          <p>📞 Cel: ${appt.phone} | 💈 ${appt.service}</p>
          <p>📅 <strong>${appt.date}</strong> a las <strong>${appt.time} hs</strong> | 👤 Barbero: ${appt.barber}</p>
        </div>
        <div class="appt-actions">
          <button class="btn-delete-appt" data-id="${keyId}">Cancelar Turno</button>
        </div>
      `;
      appointmentsList.appendChild(card);
    });

    // Delete appointment handler
    appointmentsList.querySelectorAll('.btn-delete-appt').forEach(btn => {
      btn.addEventListener('click', async () => {
        const keyId = btn.dataset.id;
        
        if (supabase) {
          try {
            // If it's an integer key or UUID from Supabase
            const { error } = await supabase
              .from('barber_appointments')
              .delete()
              .eq('id', keyId);
            if (error) throw error;
          } catch (err) {
            console.error("Error deleting from Supabase, using LocalStorage fallback", err);
            let appts = JSON.parse(localStorage.getItem('barber_appointments') || '[]');
            appts = appts.filter(a => a.id !== keyId);
            localStorage.setItem('barber_appointments', JSON.stringify(appts));
          }
        } else {
          let appts = JSON.parse(localStorage.getItem('barber_appointments') || '[]');
          appts = appts.filter(a => a.id !== keyId);
          localStorage.setItem('barber_appointments', JSON.stringify(appts));
        }

        renderAppointments();
        
        // Trigger availability updates
        if (bookDate.value) {
          bookDate.dispatchEvent(new Event('change'));
        }
      });
    });
  };
});

