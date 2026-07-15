export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="section-header flex-col md:flex-row items-start md:items-center gap-4 mb-6 border-b border-white/5 pb-4">
      <div>
        <h2 className="page-title">{title}</h2>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
