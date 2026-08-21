const App = (() => {
    const pages = {
        dashboard: { title: 'Dashboard', render: PagesDashboard.render },
        rooms: { title: 'Rooms', render: PagesRooms.render },
        guests: { title: 'Guests', render: PagesGuests.render },
        bookings: { title: 'Bookings', render: PagesBookings.render },
        checkin: { title: 'Check-in / Check-out', render: PagesCheckin.render },
        payments: { title: 'Payments', render: PagesPayments.render },
        services: { title: 'Hotel Services', render: PagesServices.render },
        reports: { title: 'Reports', render: PagesReports.render },
        availability: { title: 'Room Availability', render: PagesAvailability.render },
    };

    let current = 'dashboard';
    let currentUser = null;

    function isAuthed() {
        return !!localStorage.getItem('ss_token');
    }

    function getUser() {
        if (currentUser) return currentUser;
        try { currentUser = JSON.parse(localStorage.getItem('ss_user') || 'null'); } catch { currentUser = null; }
        return currentUser;
    }

    function setUser(user) {
        currentUser = user;
        localStorage.setItem('ss_user', JSON.stringify(user));
        const av = document.getElementById('sidebarUserAvatar');
        const avTop = document.getElementById('topUserAvatar');
        const nm = document.getElementById('sidebarUserName');
        const role = document.getElementById('sidebarUserRole');
        if (user) {
            const ini = UI.initials(user.name);
            const edit = '<span class="avatar-edit"><i class="fa-solid fa-camera"></i></span>';
            av.innerHTML = (user.avatar ? `<img src="${user.avatar}" alt="">` : ini) + edit;
            avTop.innerHTML = user.avatar ? `<img src="${user.avatar}" alt="">` : ini;
            nm.textContent = user.name;
            if (role) role.textContent = user.is_admin ? 'Administrator' : 'Client';
        }
    }

    function showLoading(show) {
        document.getElementById('loading-screen').classList.toggle('d-none', !show);
    }

    function render() {
        const authed = isAuthed();
        document.getElementById('app').style.display = authed ? 'flex' : 'none';
        document.getElementById('auth-screen').classList.toggle('d-none', authed);
        document.getElementById('todayChip').innerHTML = `<i class="fa-solid fa-calendar-day"></i>${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`;

        if (!authed) {
            const hash = window.location.hash;
            const authForms = document.getElementById('auth-forms');
            if (hash === '#/register') authForms.innerHTML = AuthForms.register();
            else authForms.innerHTML = AuthForms.login();
            window.scrollTo(0, 0);
            return;
        }

        const cached = getUser();
        if (cached) setUser(cached);
        if (!cached) {
            Api.me().then((res) => setUser(res.data.data)).catch(() => {});
        }

        const route = current;
        const page = pages[route] || pages.dashboard;
        document.getElementById('bcCurrent').textContent = page.title;
        document.querySelectorAll('.nav-link').forEach((el) => el.classList.toggle('active', el.dataset.route === route));

        const root = document.getElementById('page-root');
        root.innerHTML = '';
        page.render(root);
    }

    function navigate(hash) {
        const route = hash.replace('#/', '').split('?')[0] || 'dashboard';
        if (pages[route]) current = route;
        else current = 'dashboard';
        render();
        document.getElementById('sidebar').classList.remove('open');
        const ov = document.querySelector('.sidebar-overlay');
        if (ov) ov.remove();
        window.scrollTo(0, 0);
    }

    function init() {
        document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
        document.getElementById('btnLogout').addEventListener('click', logout);
        document.getElementById('globalSearchInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                const q = encodeURIComponent(e.target.value.trim());
                const searchPages = { rooms: '#/rooms', guests: '#/guests', bookings: '#/bookings', payments: '#/payments', services: '#/services' };
                if (current in searchPages) {
                    window.location.hash = searchPages[current] + `?q=${q}`;
                } else {
                    window.location.hash = `#/rooms?q=${q}`;
                }
            }
        });

        window.addEventListener('hashchange', () => navigate(window.location.hash));

        document.addEventListener('click', (e) => {
            const ov = e.target.closest('.sidebar-overlay');
            if (ov) { ov.remove(); document.getElementById('sidebar').classList.remove('open'); }
        });

        initAvatarModal();

        if (!window.location.hash) window.location.hash = '#/dashboard';
        navigate(window.location.hash);
    }

    function initAvatarModal() {
        const modalEl = document.getElementById('avatarModal');
        const input = document.getElementById('avatarFileInput');
        const preview = document.getElementById('avatarPreviewImg');
        const errEl = document.getElementById('avatarUploadError');
        const saveBtn = document.getElementById('avatarSaveBtn');
        if (!modalEl || !input) return;
        const modal = new bootstrap.Modal(modalEl);

        document.getElementById('sidebarUserAvatar').addEventListener('click', () => {
            errEl.textContent = '';
            input.value = '';
            preview.src = (currentUser && currentUser.avatar) ? currentUser.avatar : '';
            preview.style.opacity = '0';
            saveBtn.disabled = true;
            modal.show();
        });

        input.addEventListener('change', () => {
            errEl.textContent = '';
            const file = input.files[0];
            if (!file) return;
            if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
                errEl.textContent = 'Please choose a JPG, PNG or WEBP image.';
                saveBtn.disabled = true;
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                errEl.textContent = 'Image must be under 2 MB.';
                saveBtn.disabled = true;
                return;
            }
            const reader = new FileReader();
            reader.onload = () => { preview.src = reader.result; preview.style.opacity = '1'; };
            reader.readAsDataURL(file);
            saveBtn.disabled = false;
        });

        saveBtn.addEventListener('click', async () => {
            const file = input.files[0];
            if (!file) return;
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Uploading...';
            try {
                const fd = new FormData();
                fd.append('avatar', file);
                const res = await Api.updateAvatar(fd);
                setUser(res.data.data);
                modal.hide();
                UI.toast('Avatar updated successfully');
            } catch (err) {
                const data = err.response?.data;
                errEl.textContent = (data && data.errors && data.errors.avatar && data.errors.avatar[0]) || 'Upload failed. Please try again.';
            } finally {
                saveBtn.innerHTML = '<i class="fa-solid fa-upload me-1"></i> Upload';
                saveBtn.disabled = true;
            }
        });
    }

    function toggleSidebar() {
        const sb = document.getElementById('sidebar');
        const open = sb.classList.toggle('open');
        if (open) {
            const ov = document.createElement('div');
            ov.className = 'sidebar-overlay';
            document.body.appendChild(ov);
        } else {
            document.querySelector('.sidebar-overlay')?.remove();
        }
    }

    function logout() {
        UI.confirm({
            title: 'Sign out?',
            text: 'You will be redirected to the login page.',
            confirmText: 'Sign out',
            onConfirm: () => {
                Api.logout().finally(() => {
                    localStorage.removeItem('ss_token');
                    localStorage.removeItem('ss_user');
                    currentUser = null;
                    window.location.hash = '#/login';
                    render();
                });
            },
        });
    }

    return { init, render, navigate, getUser, setUser, isAuthed, showLoading };
})();

const AuthForms = (() => {
    function login() {
        return `
        <form class="auth-form" id="authLoginForm">
            <div class="mb-3">
                <label class="form-label">Email address</label>
                <div class="input-group">
                    <span class="input-group-text"><i class="fa-solid fa-envelope"></i></span>
                    <input type="email" class="form-control" name="email" placeholder="admin@staysphere.com" required>
                </div>
            </div>
            <div class="mb-3">
                <label class="form-label">Password</label>
                <div class="input-group">
                    <span class="input-group-text"><i class="fa-solid fa-lock"></i></span>
                    <input type="password" class="form-control" name="password" id="loginPassword" placeholder="••••••••" required>
                    <button type="button" class="btn btn-outline-secondary pw-toggle" data-toggle-pw="loginPassword" tabindex="-1"><i class="fa-solid fa-eye"></i></button>
                </div>
            </div>
            <button type="submit" class="btn btn-gold w-100 mt-2 py-2">Sign in <i class="fa-solid fa-arrow-right ms-1"></i></button>
            <div class="auth-switch">New here? <a data-auth="register">Create an account</a></div>
        </form>`;
    }

    function register() {
        return `
        <form class="auth-form" id="authRegisterForm">
            <div class="mb-3">
                <label class="form-label">Full name</label>
                <div class="input-group">
                    <span class="input-group-text"><i class="fa-solid fa-user"></i></span>
                    <input type="text" class="form-control" name="name" placeholder="Jane Doe" required>
                </div>
            </div>
            <div class="mb-3">
                <label class="form-label">Email address</label>
                <div class="input-group">
                    <span class="input-group-text"><i class="fa-solid fa-envelope"></i></span>
                    <input type="email" class="form-control" name="email" placeholder="you@example.com" required>
                </div>
            </div>
            <div class="row g-2">
                <div class="col">
                    <label class="form-label">Password</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="fa-solid fa-lock"></i></span>
                        <input type="password" class="form-control" name="password" id="regPassword" placeholder="Min. 8 chars" required>
                        <button type="button" class="btn btn-outline-secondary pw-toggle" data-toggle-pw="regPassword" tabindex="-1"><i class="fa-solid fa-eye"></i></button>
                    </div>
                </div>
                <div class="col">
                    <label class="form-label">Confirm</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="fa-solid fa-lock"></i></span>
                        <input type="password" class="form-control" name="password_confirmation" id="regPasswordConfirm" placeholder="Repeat password" required>
                        <button type="button" class="btn btn-outline-secondary pw-toggle" data-toggle-pw="regPasswordConfirm" tabindex="-1"><i class="fa-solid fa-eye"></i></button>
                    </div>
                </div>
            </div>
            <button type="submit" class="btn btn-gold w-100 mt-3 py-2">Create account <i class="fa-solid fa-arrow-right ms-1"></i></button>
            <div class="auth-switch">Already have an account? <a data-auth="login">Sign in</a></div>
        </form>`;
    }

    function wire() {
        const switchEl = document.querySelector('[data-auth]');
        if (switchEl && !switchEl._wired) {
            switchEl._wired = true;
            switchEl.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.hash = e.target.dataset.auth === 'register' ? '#/register' : '#/login';
            });
        }

        document.querySelectorAll('[data-toggle-pw]').forEach((btn) => {
            if (btn._wired) return;
            btn._wired = true;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const input = document.getElementById(btn.dataset.togglePw);
                if (!input) return;
                const show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                btn.innerHTML = show ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
            });
        });

        const lf = document.getElementById('authLoginForm');
        if (lf && !lf._wired) {
            lf._wired = true;
            lf.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = lf.querySelector('[type="submit"]');
                btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';
                try {
                    const res = await Api.login(Object.fromEntries(new FormData(lf).entries()));
                    localStorage.setItem('ss_token', res.data.data.token);
                    App.setUser(res.data.data.user);
                    window.location.hash = '#/dashboard';
                    App.render();
                    UI.toast(`Welcome back, ${res.data.data.user.name}!`);
                } catch (err) {
                    const res = err.response;
                    if (res && res.status === 401) UI.toast('Invalid email or password.', 'error');
                    else UI.showFieldErrors(lf, res?.data?.errors);
                } finally { btn.disabled = false; btn.innerHTML = 'Sign in <i class="fa-solid fa-arrow-right ms-1"></i>'; }
            });
        }

        const rf = document.getElementById('authRegisterForm');
        if (rf && !rf._wired) {
            rf._wired = true;
            rf.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = rf.querySelector('[type="submit"]');
                btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';
                try {
                    const res = await Api.register(Object.fromEntries(new FormData(rf).entries()));
                    localStorage.setItem('ss_token', res.data.data.token);
                    App.setUser(res.data.data.user);
                    window.location.hash = '#/dashboard';
                    App.render();
                    UI.toast('Account created. Welcome to StaySphere!');
                } catch (err) {
                    const res = err.response;
                    if (res?.status === 422) UI.showFieldErrors(rf, res.data.errors);
                    else UI.toast(res?.data?.message || 'Registration failed', 'error');
                } finally { btn.disabled = false; btn.innerHTML = 'Create account <i class="fa-solid fa-arrow-right ms-1"></i>'; }
            });
        }
    }

    return { login, register, wire };
})();

document.addEventListener('DOMContentLoaded', () => {
    App.init();
    // re-wire auth forms after render
    const observer = new MutationObserver(() => AuthForms.wire());
    observer.observe(document.getElementById('auth-forms'), { childList: true, subtree: true });
    AuthForms.wire();
});
