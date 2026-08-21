const API = axios.create({
    baseURL: '/api/v1',
    headers: { Accept: 'application/json' },
});

API.interceptors.request.use((config) => {
    const token = localStorage.getItem('ss_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('ss_token');
            localStorage.removeItem('ss_user');
            window.location.hash = '#/login';
            if (window.App) App.render();
        }
        return Promise.reject(error);
    }
);

function spoof(data, method) {
    if (data instanceof FormData) {
        data.append('_method', method);
        return data;
    }
    return { ...(data || {}), _method: method };
}

const Api = {
    login: (data) => API.post('/auth/login', data),
    register: (data) => API.post('/auth/register', data),
    logout: () => API.post('/auth/logout'),
    me: () => API.get('/auth/me'),
    updateAvatar: (data) => API.post('/auth/avatar', data),

    dashboard: () => API.get('/dashboard'),
    dashboardCharts: () => API.get('/dashboard/charts'),
    reports: (params) => API.get('/reports', { params }),

    rooms: (params) => API.get('/rooms', { params }),
    room: (id) => API.get(`/rooms/${id}`),
    createRoom: (data) => API.post('/rooms', data),
    updateRoom: (id, data) => API.post(`/rooms/${id}`, spoof(data, 'PUT')),
    deleteRoom: (id) => API.delete(`/rooms/${id}`),

    guests: (params) => API.get('/guests', { params }),
    guest: (id) => API.get(`/guests/${id}`),
    createGuest: (data) => API.post('/guests', data),
    updateGuest: (id, data) => API.post(`/guests/${id}`, spoof(data, 'PUT')),
    deleteGuest: (id) => API.delete(`/guests/${id}`),

    bookings: (params) => API.get('/bookings', { params }),
    booking: (id) => API.get(`/bookings/${id}`),
    createBooking: (data) => API.post('/bookings', data),
    updateBooking: (id, data) => API.post(`/bookings/${id}`, spoof(data, 'PUT')),
    deleteBooking: (id) => API.delete(`/bookings/${id}`),
    checkIn: (id) => API.post(`/bookings/${id}/check-in`),
    checkOut: (id) => API.post(`/bookings/${id}/check-out`),
    todayActivity: () => API.get('/checkins-today'),

    payments: (params) => API.get('/payments', { params }),
    createPayment: (data) => API.post('/payments', data),
    updatePayment: (id, data) => API.post(`/payments/${id}`, spoof(data, 'PUT')),
    deletePayment: (id) => API.delete(`/payments/${id}`),

    services: (params) => API.get('/services', { params }),
    createService: (data) => API.post('/services', data),
    updateService: (id, data) => API.post(`/services/${id}`, spoof(data, 'PUT')),
    deleteService: (id) => API.delete(`/services/${id}`),

    availability: (params) => API.get('/availability', { params }),
};

window.Api = Api;
