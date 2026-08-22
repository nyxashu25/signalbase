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
    markTutorialCompleted(state) {
      if (state.user) state.user.tutorialCompletedAt = new Date().toISOString();
    },
    // Settings pages patch the cached user/workspace after a successful save
    // so the shell (avatar, top bar name) updates without a refetch of /me.
    updateUser(state, action) {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    updateWorkspace(state, action) {
      if (state.workspace) state.workspace = { ...state.workspace, ...action.payload };
    },
  },
});

export const { setSession, clearSession, markTutorialCompleted, updateUser, updateWorkspace } =
  authSlice.actions;
export default authSlice.reducer;
