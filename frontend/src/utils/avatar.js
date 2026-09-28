/**
 * Helper to get a fast, non-blocking avatar URL
 * Supports:
 * - getAvatarUrl(userObject)
 * - getAvatarUrl(profilePhotoUrl, fallbackName, fallbackGender)
 */
export const getAvatarUrl = (userOrPhoto, fallbackName, fallbackGender) => {
    if (!userOrPhoto) {
        const name = fallbackName || "User";
        const bg = fallbackGender === "female" ? "ec4899" : "2563eb";
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&bold=true&size=128`;
    }

    // If passed a string
    if (typeof userOrPhoto === 'string') {
        if ((userOrPhoto.startsWith('http://') || userOrPhoto.startsWith('https://') || userOrPhoto.startsWith('data:')) && !userOrPhoto.includes("iran.liara.run")) {
            return userOrPhoto;
        }
        const name = fallbackName || userOrPhoto || "User";
        const bg = fallbackGender === "female" ? "ec4899" : "2563eb";
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&bold=true&size=128`;
    }

    // If passed a user object
    if (userOrPhoto.profilePhoto && !userOrPhoto.profilePhoto.includes("iran.liara.run")) {
        return userOrPhoto.profilePhoto;
    }

    const name = userOrPhoto.fullName || userOrPhoto.username || fallbackName || "User";
    const bg = userOrPhoto.gender === "female" ? "ec4899" : "2563eb";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&bold=true&size=128`;
};
