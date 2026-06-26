document.addEventListener('DOMContentLoaded', () => {

  // --- Date Formatter Utility ---
  const formatDateToLetters = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    let formatted = new Intl.DateTimeFormat('es-ES', options).format(date);
    if (formatted) {
      formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    return formatted;
  };

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


  // --- SECURITY: INPUT SANITIZATION UTILITY ---
  const sanitizeHTML = (str) => {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (match) => {
      const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return escapeMap[match];
    });
  };

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
      let blocks = JSON.parse(localStorage.getItem('barber_blocks') || '[]');

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

      // Filter slots already taken or manually blocked
      bookTime.innerHTML = '<option value="" disabled selected>Seleccioná un horario</option>';
      
      let availableCount = 0;
      slots.forEach(slot => {
        // Check if slot is taken by a booking
        const isTaken = appointments.some(appt => 
          appt.date === selectedDate && 
          appt.time === slot && 
          (selectedBarber === 'Cualquiera' || appt.barber === selectedBarber || appt.barber === 'Cualquiera')
        );

        // Check if slot is blocked by admin
        const isBlocked = blocks.some(b => 
          b.date === selectedDate && 
          (b.time === 'Todo el dia' || b.time === slot) &&
          (b.barber === 'Ambos' || selectedBarber === 'Cualquiera' || b.barber === selectedBarber)
        );

        const isUnavailable = isTaken || isBlocked;

        if (!isUnavailable) availableCount++;

        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot + (isTaken ? ' (Ocupado)' : isBlocked ? ' (Bloqueado)' : '');
        if (isUnavailable) {
          option.disabled = true;
        }
        bookTime.appendChild(option);
      });

      bookTime.disabled = false;

      // Update Availability Banner
      const statusBanner = document.getElementById('booking-availability-status');
      const submitBtn = document.getElementById('btn-submit-booking');

      if (statusBanner && submitBtn) {
        statusBanner.style.display = 'block';
        if (availableCount === 0) {
          statusBanner.className = 'availability-status danger';
          statusBanner.textContent = '❌ Sin turnos disponibles para esta fecha. Probá con otro día.';
          submitBtn.disabled = true;
        } else if (availableCount > 0 && availableCount < 5) {
          statusBanner.className = 'availability-status warning';
          statusBanner.textContent = `⚠️ ¡Últimos turnos disponibles! Quedan solo ${availableCount} lugares.`;
          submitBtn.disabled = false;
        } else {
          statusBanner.style.display = 'none';
          submitBtn.disabled = false;
        }
      }
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
        service: sanitizeHTML(bookService.value),
        barber: bookBarber.value === 'Cualquiera' ? (Math.random() > 0.5 ? 'Cristian Levio (Mele)' : 'Blas Levio (Tato)') : sanitizeHTML(bookBarber.value),
        date: sanitizeHTML(bookDate.value),
        time: sanitizeHTML(bookTime.value),
        name: sanitizeHTML(document.getElementById('book-name').value.trim()),
        phone: sanitizeHTML(document.getElementById('book-phone').value.trim().replace(/[^\d+]/g, ''))
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
        
        // Refresh availability
        const statusBanner = document.getElementById('booking-availability-status');
        if (statusBanner) statusBanner.style.display = 'none';

        // Refresh admin dashboard list if visible
        renderAppointments();
      }, 3000);
    });
  }

  // --- AUDIO ALERT NOTIFICATION SYSTEM (Web Audio API Synth) ---
  let lastAppointmentCount = -1;
  let pollInterval = null;

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // First Note
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain1.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.15);

      // Second Note (Harmonious chord delay)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.3);
      }, 100);

    } catch (err) {
      console.warn("Web Audio API not allowed or supported yet", err);
    }
  };

  // --- BARBER ADMIN DASHBOARD ---
  if (btnAdminToggle && adminPanel) {
    btnAdminToggle.addEventListener('click', () => {
      const isHidden = adminPanel.style.display === 'none';
      
      if (isHidden) {
        const password = prompt('Por favor, ingresá la contraseña de barbero:');
        if (password === 'imperio18') {
          adminPanel.style.display = 'block';
          populateBlockTimes();
          renderAppointments();
          
          // Start background poller for new bookings (every 8 seconds)
          lastAppointmentCount = -1; // Reset to avoid double triggers on opening
          pollInterval = setInterval(async () => {
            await renderAppointments(true); // true signals a silent poll check
          }, 8000);

        } else if (password !== null) {
          alert('Contraseña incorrecta. Acceso denegado.');
        }
      } else {
        adminPanel.style.display = 'none';
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }
    });
  }

  // Populate block times options
  const populateBlockTimes = () => {
    const blockStart = document.getElementById('block-time-start');
    const blockEnd = document.getElementById('block-time-end');
    if (!blockStart || !blockEnd) return;
    
    // Clear dynamic but keep "Todo el dia"
    blockStart.innerHTML = '<option value="Todo el dia">Todo el día</option>';
    blockEnd.innerHTML = '<option value="Todo el dia">Todo el día</option>';
    
    const fakeDate = '2026-01-01'; // Just to generate standard slots
    const slots = generateTimeSlots(fakeDate);
    
    slots.forEach(slot => {
      const opt1 = document.createElement('option');
      opt1.value = slot;
      opt1.textContent = slot + ' hs';
      blockStart.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = slot;
      opt2.textContent = slot + ' hs';
      blockEnd.appendChild(opt2);
    });

    // Handle "Todo el dia" dependency
    blockStart.addEventListener('change', () => {
      if (blockStart.value === 'Todo el dia') {
        blockEnd.value = 'Todo el dia';
        blockEnd.disabled = true;
      } else {
        blockEnd.disabled = false;
        // Pre-select next slot
        const startIndex = slots.indexOf(blockStart.value);
        if (startIndex !== -1 && startIndex < slots.length - 1) {
          blockEnd.value = slots[startIndex + 1];
        }
      }
    });
  };

  // Handle Apply Block Range
  const btnApplyBlock = document.getElementById('btn-apply-block');
  if (btnApplyBlock) {
    btnApplyBlock.addEventListener('click', () => {
      const dateVal = document.getElementById('block-date').value;
      const startVal = document.getElementById('block-time-start').value;
      const endVal = document.getElementById('block-time-end').value;
      const barberVal = document.getElementById('block-barber').value;

      if (!dateVal) {
        alert('Por favor, seleccioná una fecha para bloquear.');
        return;
      }

      const blocks = JSON.parse(localStorage.getItem('barber_blocks') || '[]');
      
      if (startVal === 'Todo el dia') {
        // Block whole day
        const newBlock = {
          id: Date.now().toString(),
          isBlock: true,
          name: `BLOQUEADO (Todo el día)`,
          phone: 'N/A',
          service: 'Bloqueo Manual',
          barber: barberVal,
          date: dateVal,
          time: 'Todo el dia'
        };
        blocks.push(newBlock);
      } else {
        // Block range (generate sub-blocks for each half hour slot in range)
        const slots = generateTimeSlots(dateVal);
        const startIndex = slots.indexOf(startVal);
        const endIndex = slots.indexOf(endVal);

        if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
          alert('Rango de horarios inválido. El horario "Desde" debe ser menor que "Hasta".');
          return;
        }

        // Loop and add blocks for each slot in the range [startIndex, endIndex]
        for (let i = startIndex; i <= endIndex; i++) {
          const slot = slots[i];
          const newBlock = {
            id: `${Date.now()}-${i}`,
            isBlock: true,
            name: `BLOQUEADO (${slot})`,
            phone: 'N/A',
            service: 'Bloqueo Manual',
            barber: barberVal,
            date: dateVal,
            time: slot
          };
          blocks.push(newBlock);
        }
      }

      localStorage.setItem('barber_blocks', JSON.stringify(blocks));
      alert(`Horarios bloqueados con éxito para el día ${dateVal}.`);
      
      renderAppointments();
      
      // Update client calendar immediately if open
      if (bookDate.value) {
        bookDate.dispatchEvent(new Event('change'));
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

  const renderAppointments = async (isPoll = false) => {
    if (!appointmentsList) return;
    
    let appointments = [];
    
    // Load bookings
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

    // Trigger Sound Alert if list count increased
    if (lastAppointmentCount !== -1 && appointments.length > lastAppointmentCount) {
      playNotificationSound();
    }
    lastAppointmentCount = appointments.length;

    // Load blocks and merge
    const blocks = JSON.parse(localStorage.getItem('barber_blocks') || '[]');
    const mergedList = [...appointments, ...blocks];

    // Sort chronologically by date and time
    mergedList.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

    // Filter appointments
    const filtered = mergedList.filter(appt => {
      if (currentFilter === 'Todos') return true;
      if (appt.isBlock) {
        return appt.barber === 'Ambos' || appt.barber === currentFilter;
      }
      return appt.barber === currentFilter;
    });

    if (filtered.length === 0) {
      appointmentsList.innerHTML = '<p class="no-appts">No hay turnos agendados ni bloqueos para este barbero.</p>';
      return;
    }

    // Group items by Date key
    const grouped = {};
    filtered.forEach(appt => {
      if (!grouped[appt.date]) {
        grouped[appt.date] = [];
      }
      grouped[appt.date].push(appt);
    });

    appointmentsList.innerHTML = '';

    // Render grouped lists sorted by date
    Object.keys(grouped).sort().forEach(date => {
      // Create Date Header section
      const dateHeader = document.createElement('div');
      dateHeader.className = 'date-group-header';
      dateHeader.innerHTML = `<h4 style="margin: 24px 0 12px; color: var(--gold); border-bottom: 1px solid var(--border); padding-bottom: 6px; font-size: 1.1rem;">📅 Fecha: ${date}</h4>`;
      appointmentsList.appendChild(dateHeader);

      grouped[date].forEach(appt => {
        const card = document.createElement('div');
        card.className = 'appt-card';
        card.style.marginBottom = '8px';
        
        const keyId = appt.id ? appt.id : `${appt.date}-${appt.time}-${appt.name}`;
        
        if (appt.isBlock) {
          card.innerHTML = `
            <div class="appt-info" style="flex: 1; opacity: 0.7; padding-right: 16px;">
              <h4 style="color: #ff5252; font-size: 1rem; font-weight: 700; margin-bottom: 4px;">🚫 HORARIO BLOQUEADO</h4>
              <div style="font-size: 1.8rem; font-weight: 800; color: var(--text-muted); line-height: 1; margin: 4px 0;">${appt.time} hs</div>
              <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted); text-transform: capitalize;">📅 ${formatDateToLetters(appt.date)}</div>
              <p style="font-size: 0.8rem; margin-top: 4px;">👤 Barbero: ${appt.barber}</p>
            </div>
            <div class="appt-actions">
              <button class="btn-delete-appt btn-unblock" data-id="${appt.id}" style="color: var(--gold); border-color: var(--gold);">Desbloquear</button>
            </div>
          `;
        } else {
          // Build pre-formatted WhatsApp Message text for the notification
          const waText = encodeURIComponent(`Hola ${appt.name}! Te escribimos de Barbería Imperio para recordarte tu turno del día ${appt.date} a las ${appt.time} hs para un ${appt.service}. ¡Te esperamos!`);
          
          card.innerHTML = `
            <div class="appt-info" style="flex: 1; padding-right: 16px;">
              <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 2px;">Cliente</div>
              <h4 style="font-size: 1.15rem; font-weight: 700; color: var(--white); margin: 0 0 6px 0;">${appt.name}</h4>
              
              <div style="font-size: 2.2rem; font-weight: 800; color: var(--gold); line-height: 1; margin: 6px 0;">${appt.time} hs</div>
              
              <div style="font-size: 0.95rem; font-weight: 600; color: var(--text); text-transform: capitalize; margin-bottom: 8px;">📅 ${formatDateToLetters(appt.date)}</div>
              
              <div style="font-size: 0.82rem; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 6px; margin-top: 6px; display: flex; flex-wrap: wrap; gap: 12px;">
                <span>💈 ${appt.service}</span>
                <span>👤 Barbero: ${appt.barber}</span>
                <span>📞 Cel: ${appt.phone}</span>
              </div>
            </div>
            <div class="appt-actions" style="display: flex; flex-direction: column; gap: 8px; justify-content: center; align-items: flex-end;">
              <a href="https://wa.me/549${appt.phone}?text=${waText}" target="_blank" class="btn-send-whatsapp">Recordar 📱</a>
              <button class="btn-delete-appt" data-id="${keyId}">Cancelar</button>
            </div>
          `;
        }
        appointmentsList.appendChild(card);
      });
    });

    // Delete / Unblock appointment handler
    appointmentsList.querySelectorAll('.btn-delete-appt').forEach(btn => {
      btn.addEventListener('click', async () => {
        const keyId = btn.dataset.id;
        
        if (btn.classList.contains('btn-unblock')) {
          // Unblock local block
          let blocks = JSON.parse(localStorage.getItem('barber_blocks') || '[]');
          blocks = blocks.filter(b => b.id !== keyId);
          localStorage.setItem('barber_blocks', JSON.stringify(blocks));
        } else {
          // Cancel booking
          if (supabase) {
            try {
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
