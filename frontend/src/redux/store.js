import { combineReducers, configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice.js";
import messageReducer from "./messageSlice.js";
import socketReducer from "./socketSlice.js";
import callReducer from "./callSlice.js";
import {
    persistReducer,
    FLUSH,
    REHYDRATE,
    PAUSE,
    PERSIST,
    PURGE,
    REGISTER,
} from 'redux-persist';

// ─── Use sessionStorage so each browser TAB has its OWN session ───
// This allows logging in as different users in different tabs.
import storageSession from 'redux-persist/lib/storage/session';

const persistConfig = {
    key: 'root',
    version: 1,
    storage: storageSession,   // <-- sessionStorage (per-tab) instead of localStorage (shared)
    whitelist: ['user'],       // only persist user auth state
};

const rootReducer = combineReducers({
    user: userReducer,
    message: messageReducer,
    socket: socketReducer,
    call: callReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            },
        }),
});

export default store;
