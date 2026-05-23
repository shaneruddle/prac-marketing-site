document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileToggle && mobileMenu) {
        mobileToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('translate-x-full');
            // Change icon if needed, but simple toggle for now
            console.log('Mobile menu toggled');
        });

        // Close menu when clicking links
        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('translate-x-full');
            });
        });
    }

    // Booking Form Logic + Date Range Picker
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const today = new Date(); today.setHours(0,0,0,0);

        const elPickupInput = document.getElementById('dp-input-pickup');
        const elReturnInput = document.getElementById('dp-input-return');
        const elPickupVal = document.getElementById('dp-val-pickup');
        const elReturnVal = document.getElementById('dp-val-return');
        const elTriggerPickup = document.getElementById('dp-trigger-pickup');
        const elTriggerReturn = document.getElementById('dp-trigger-return');
        const overlay = document.getElementById('dp-overlay');

        let viewMonth = today.getMonth(), viewYear = today.getFullYear();
        let startDate = null, endDate = null;
        let committed = { start: null, end: null };

        const sameDay = (a,b) => a && b && a.getTime() === b.getTime();
        const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const fmt = d => `${DOW[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}`;

        function buildGrid(el, year, month) {
            el.innerHTML = '';
            const first = new Date(year, month, 1).getDay();
            const days = new Date(year, month+1, 0).getDate();
            for (let i=0;i<first;i++){ const e=document.createElement('div'); e.className='dp-day is-empty'; el.appendChild(e); }
            for (let d=1; d<=days; d++) {
                const date = new Date(year, month, d); date.setHours(0,0,0,0);
                const b = document.createElement('button');
                b.type='button'; b.className='dp-day'; b.textContent=d;
                if (date < today) b.classList.add('is-disabled');
                if (sameDay(date, today)) b.classList.add('is-today');
                if (startDate && endDate) {
                    if (sameDay(date,startDate)) b.classList.add('range-start');
                    else if (sameDay(date,endDate)) b.classList.add('range-end');
                    else if (date>startDate && date<endDate) b.classList.add('in-range');
                } else if (startDate && sameDay(date,startDate)) {
                    b.classList.add('is-single');
                }
                if (!b.classList.contains('is-disabled')) b.addEventListener('click', () => pick(date));
                el.appendChild(b);
            }
        }

        function pick(date) {
            if (!startDate || (startDate && endDate)) { startDate = date; endDate = null; }
            else if (date < startDate) { endDate = startDate; startDate = date; }
            else if (sameDay(date, startDate)) { /* ignore same-day */ }
            else { endDate = date; }
            render();
        }

        function render() {
            const n = viewMonth===11?0:viewMonth+1, ny = viewMonth===11?viewYear+1:viewYear;
            document.getElementById('dp-m1-label').textContent = `${MONTHS[viewMonth]} ${viewYear}`;
            document.getElementById('dp-m2-label').textContent = `${MONTHS[n]} ${ny}`;
            buildGrid(document.getElementById('dp-m1-grid'), viewYear, viewMonth);
            buildGrid(document.getElementById('dp-m2-grid'), ny, n);
            document.getElementById('dp-prev').disabled =
                (viewYear < today.getFullYear()) || (viewYear===today.getFullYear() && viewMonth<=today.getMonth());
            const dur = document.getElementById('dp-duration');
            const apply = document.getElementById('dp-apply');
            const hint = document.getElementById('dp-hint');
            if (startDate && endDate) {
                const days = Math.round((endDate-startDate)/86400000);
                document.getElementById('dp-duration-pill').textContent = days + (days===1?' day':' days');
                dur.style.visibility='visible'; apply.disabled=false;
                hint.textContent = `Pickup ${fmt(startDate)} → Return ${fmt(endDate)}`;
            } else if (startDate) {
                dur.style.visibility='hidden'; apply.disabled=true;
                hint.textContent = 'Now select your return date';
            } else {
                dur.style.visibility='hidden'; apply.disabled=true;
                hint.textContent = 'Select your pickup date';
            }
        }

        function openCal() {
            if (committed.start) { viewMonth = committed.start.getMonth(); viewYear = committed.start.getFullYear(); }
            startDate = committed.start; endDate = committed.end;
            render(); overlay.classList.add('is-open');
        }
        function closeCal(){ overlay.classList.remove('is-open'); }

        elTriggerPickup.addEventListener('click', openCal);
        elTriggerReturn.addEventListener('click', openCal);
        document.getElementById('dp-cancel').addEventListener('click', closeCal);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeCal(); });
        document.getElementById('dp-prev').addEventListener('click', () => { if(viewMonth===0){viewMonth=11;viewYear--;}else viewMonth--; render(); });
        document.getElementById('dp-next').addEventListener('click', () => { if(viewMonth===11){viewMonth=0;viewYear++;}else viewMonth++; render(); });

        document.getElementById('dp-apply').addEventListener('click', () => {
            committed.start = startDate; committed.end = endDate;
            elPickupInput.value = iso(startDate); elReturnInput.value = iso(endDate);
            elPickupVal.textContent = fmt(startDate); elReturnVal.textContent = fmt(endDate);
            elTriggerPickup.classList.remove('is-placeholder');
            elTriggerReturn.classList.remove('is-placeholder');
            closeCal();
        });

        // Default selection: tomorrow → +8 days (preserves prior default behaviour)
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
        const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate()+8);
        committed.start = tomorrow; committed.end = nextWeek;
        elPickupInput.value = iso(tomorrow); elReturnInput.value = iso(nextWeek);
        elPickupVal.textContent = fmt(tomorrow); elReturnVal.textContent = fmt(nextWeek);
        elTriggerPickup.classList.remove('is-placeholder');
        elTriggerReturn.classList.remove('is-placeholder');

        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const from = elPickupInput.value;
            const to = elReturnInput.value;
            const pickupTime = bookingForm.pickup_time.value || "09:00";
            const dropoffTime = bookingForm.dropoff_time.value || "09:00";
            // Redirect to booking engine: from/to dates + times (no location at this stage)
            const bookingUrl = `https://pattayarentacar.com/?from=${from}&to=${to}&pickupTime=${pickupTime}&dropoffTime=${dropoffTime}`;
            window.location.href = bookingUrl;
        });
    }
    // FAQ Accordion
    document.querySelectorAll('.faq-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
            const item = trigger.closest('.faq-item');
            const answer = item.querySelector('.faq-answer');
            const chevron = trigger.querySelector('.faq-chevron');
            const isOpen = !answer.classList.contains('hidden');
            if (isOpen) {
                answer.classList.add('hidden');
                chevron.classList.remove('rotate-180');
            } else {
                answer.classList.remove('hidden');
                chevron.classList.add('rotate-180');
            }
        });
    });

    // Lazy load images fallback
    if ('loading' in HTMLImageElement.prototype) {
        // Supported
    } else {
        // Fallback for older browsers if needed
    }
});
