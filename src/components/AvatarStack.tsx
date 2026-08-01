interface AvatarStackProps {
  initials: string[];
}

export default function AvatarStack({ initials }: AvatarStackProps) {
  return (
    <div className="lp-avatars" aria-hidden="true">
      {initials.map((initial, i) => (
        <span key={initial} className={`lp-avatar lp-avatar-${i % 3}`}>
          {initial}
        </span>
      ))}
    </div>
  );
}
