import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  accessToken: null,
  user: null,
  workspace: null,
  role: null,
  // Distinguishes "haven't checked yet" from "checked, not logged in" so
  // route guards don't flash a login redirect while the silent refresh
  // (see App.jsx) is still in flight on page load.
  status: 'checking',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action) {
      const { accessToken, user, workspace, role } = action.payload;
      state.accessToken = accessToken;
      state.user = user;
      state.workspace = workspace;
      state.role = role;
      state.status = 'authenticated';
    },
    clearSession(state) {
      state.accessToken = null;
      state.user = null;
      state.workspace = null;
      state.role = null;
      state.status = 'anonymous';
    },
  },
});

export const { setSession, clearSession } = authSlice.actions;
export default authSlice.reducer;
