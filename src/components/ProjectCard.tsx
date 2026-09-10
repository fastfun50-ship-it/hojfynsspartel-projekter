import Link from "next/link";

type Props = {
  href: string;
  title: string;
  coverUrl: string | null;
  badge?: string;
  subtitle?: string;
  children?: React.ReactNode;
};

export default function ProjectCard({
  href,
  title,
  coverUrl,
  badge,
  subtitle,
  children,
}: Props) {
  return (
    <article className="project-card">
      <Link href={href} className="project-card-link">
        <div className="project-card-media">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" />
          ) : (
            <div className="project-card-placeholder" />
          )}
        </div>
        <div className="project-card-body">
          <div className="project-card-row">
            <strong className="project-card-title">{title}</strong>
            {badge ? <span className="badge">{badge}</span> : null}
          </div>
          {subtitle ? <div className="hint">{subtitle}</div> : null}
        </div>
      </Link>
      {children ? <div className="project-card-actions">{children}</div> : null}
    </article>
  );
}
