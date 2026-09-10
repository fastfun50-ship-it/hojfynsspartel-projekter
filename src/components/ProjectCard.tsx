import Link from "next/link";

type Props = {
  href: string;
  title: string;
  coverUrl: string | null;
  badge?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children?: React.ReactNode;
};

export default function ProjectCard({
  href,
  title,
  coverUrl,
  badge,
  subtitle,
  footer,
  children,
}: Props) {
  return (
    <article className={"project-card" + (coverUrl ? "" : " project-card-empty")}>
      <Link href={href} className="project-card-link">
        {coverUrl ? (
          <div className="project-card-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="" />
          </div>
        ) : null}
        <div className="project-card-body">
          <div className="project-card-row">
            <strong className="project-card-title">{title}</strong>
            {badge ? <span className="badge">{badge}</span> : null}
          </div>
          {subtitle ? <div className="hint">{subtitle}</div> : null}
        </div>
      </Link>
      {!coverUrl || footer ? (
        <div className="project-card-meta">
          {!coverUrl ? <span className="hint">Intet foto</span> : <span />}
          {footer}
        </div>
      ) : null}
      {children ? <div className="project-card-actions">{children}</div> : null}
    </article>
  );
}
