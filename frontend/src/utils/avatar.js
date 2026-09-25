/**
 * Helper to get a fast, non-blocking avatar URL
 */
export const getAvatarUrl = (user) => {
    if (user?.profilePhoto && !user.profilePhoto.includes("iran.liara.run")) {
        return user.profilePhoto;
    }
    const name = user?.fullName || user?.username || "User";
    const bg = user?.gender === "female" ? "ec4899" : "2563eb";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&bold=true&size=128`;
};
