// Centralized API endpoint paths for Noroff v2
export const endpoints = {
  auth: {
    register: "auth/register",
    login: "auth/login",
    me: "auth/me",
  },
  social: {
    posts: "social/posts",
    postById(id) {
      return "social/posts/" + encodeURIComponent(String(id));
    },
    profiles: "social/profiles",
    profileByHandle(handle) {
      return "social/profiles/" + encodeURIComponent(String(handle));
    },
  },
};
