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

    // Booking Form Logic
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        // Set default dates if empty
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 8);

        if (!bookingForm.pickup_date.value) {
            bookingForm.pickup_date.value = tomorrow.toISOString().split('T')[0];
        }
        if (!bookingForm.dropoff_date.value) {
            bookingForm.dropoff_date.value = nextWeek.toISOString().split('T')[0];
        }

        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const from = bookingForm.pickup_date.value;
            const to = bookingForm.dropoff_date.value;
            const pickupTime = bookingForm.pickup_time.value || "09:00";
            const dropoffTime = bookingForm.dropoff_time.value || "09:00";
            const location = bookingForm.pickup_location.value;

            // Redirect as requested: https://pattayarentacar.com/?from={pickup_date}&to={return_date}&pickupTime={pickup_time}&dropoffTime={dropoff_time}
            const bookingUrl = `https://pattayarentacar.com/?from=${from}&to=${to}&pickupTime=${pickupTime}&dropoffTime=${dropoffTime}&pickup_location=${location}`;
            
            window.location.href = bookingUrl;
        });
    }

    // Lazy load images fallback
    if ('loading' in HTMLImageElement.prototype) {
        // Supported
    } else {
        // Fallback for older browsers if needed
    }
});
