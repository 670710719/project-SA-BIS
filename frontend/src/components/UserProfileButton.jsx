import { useNavigate } from 'react-router-dom';

function UserProfileButton({ user }) {
  const navigate = useNavigate();
  const displayName = user?.name || user?.username || 'ผู้ใช้งาน';

  return (
    <button
      type="button"
      className="home-user-profile"
      onClick={() => navigate('/profile')}
      aria-label="ดูข้อมูลส่วนตัว"
      title="ดูข้อมูลส่วนตัว"
    >
      <span>{displayName}</span>
      <span className="home-avatar">{displayName.charAt(0)}</span>
    </button>
  );
}

export default UserProfileButton;
