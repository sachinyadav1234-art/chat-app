import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Toaster } from "react-hot-toast";
import { Provider } from "react-redux";
import store from './redux/store';
import { PersistGate } from 'redux-persist/integration/react';
import { persistStore } from 'redux-persist';
import axios from 'axios';

let persistor = persistStore(store);

if (typeof window !== 'undefined' && !window.global) {
    window.global = window;
}

export const BASE_URL = process.env.REACT_APP_BACKEND_URL || "https://chat-app-backend-7wng.onrender.com";

// ─── Global Axios Configuration & Dual Authentication Interceptor ─────────────
// Attaches Bearer JWT token from state to every outgoing request + includes credentials
axios.defaults.withCredentials = true;
axios.defaults.timeout = 15000; // 15 seconds timeout to prevent hanging requests

axios.interceptors.request.use((config) => {
    try {
        const state = store.getState();
        const token = state.user?.token || state.user?.authUser?.token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (e) {
        console.warn("Could not attach auth header", e);
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            console.error("API Request timed out:", error.config?.url);
        }
        return Promise.reject(error);
    }
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
        <Toaster position="top-right" reverseOrder={false} />
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
