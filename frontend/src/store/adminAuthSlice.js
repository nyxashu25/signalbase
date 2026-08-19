import { createSlice } from '@reduxjs/toolkit';

// Deliberately its own slice, never merged with `auth` — a super admin
// session and a tenant session must never be able to leak into each other
// in client state, matching the separate JWT secret enforced server-side.
const initialState = {
  accessToken: null,
  admin: null,
  status: 'anonymous', // admin sessions aren't silently restored on reload — no refresh-token flow (see adminAuthService.js)
};

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState,
  reducers: {
    setAdminSession(state, action) {
      const { accessToken, admin } = action.payload;
      state.accessToken = accessToken;
      state.admin = admin;
      state.status = 'authenticated';
    },
    clearAdminSession(state) {
      state.accessToken = null;
      state.admin = null;
      state.status = 'anonymous';
    },
  },
});

export const { setAdminSession, clearAdminSession } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;
