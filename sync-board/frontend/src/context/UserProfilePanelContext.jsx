import React, { createContext, useContext } from 'react';

const UserProfilePanelContext = createContext({
  openProfile: () => {}
});

export function UserProfilePanelProvider({ value, children }) {
  return <UserProfilePanelContext.Provider value={value}>{children}</UserProfilePanelContext.Provider>;
}

export function useUserProfilePanel() {
  return useContext(UserProfilePanelContext);
}

