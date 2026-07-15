import { motion } from 'framer-motion';

export default function DashboardCard({ title, value, subtitle, icon: Icon, colorClass, trend }) {
  return (
    <motion.div
      className={`${colorClass || 'glass-card-hover'} flex flex-col justify-between`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl lg:text-3xl font-display font-extrabold text-white mt-2 leading-none">
            {value}
          </h3>
        </div>
        {Icon && (
          <div className="p-3 bg-white/10 rounded-xl text-white">
            <Icon size={22} />
          </div>
        )}
      </div>
      {(subtitle || trend) && (
        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
          <span className="text-xs text-gray-500 truncate">{subtitle}</span>
          {trend && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              trend.type === 'up' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {trend.value}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
