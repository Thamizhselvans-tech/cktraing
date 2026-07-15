export default function Badge({ text, type = 'default' }) {
  const badgeClasses = {
    success: 'badge-emerald',
    warning: 'badge-amber',
    danger: 'badge-rose',
    info: 'badge-blue',
    purple: 'badge-purple',
    default: 'badge-gray',
  };

  return (
    <span className={badgeClasses[type] || badgeClasses.default}>
      {text}
    </span>
  );
}
