import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/alerts', label: 'Alerts' },
];

export default function BottomNav() {
  return (
    <nav className="w-full h-[52px] shrink-0 bg-surface border-t border-border flex items-center px-8 gap-10 select-none">
      <span className="font-sora text-[13px] font-bold tracking-[0.18em] text-primary uppercase mr-6">SENTINEL</span>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          className={({ isActive }) =>
            cn(
              'font-mono text-[12px] tracking-wide py-[15px] border-b-[2px] transition-colors duration-200 uppercase',
              isActive ? 'text-accent border-accent font-semibold' : 'text-muted border-transparent hover:text-primary'
            )
          }
        >
          {l.label}
        </NavLink>
      ))}
      <a
        href="https://github.com"
        target="_blank"
        rel="noreferrer"
        className="font-mono text-[11px] tracking-[0.06em] text-muted hover:text-primary ml-auto transition-colors uppercase"
      >
        Docs ↗
      </a>
    </nav>
  );
}
