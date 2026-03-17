import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, Info, Tag, AlertCircle, Gift, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const typeIcons = {
  info: Info,
  promo: Tag,
  alert: AlertCircle,
  benefit: Gift,
  system: Zap,
};

const typeBg = {
  info: 'bg-blue-50 text-blue-600',
  promo: 'bg-yellow-50 text-yellow-600',
  alert: 'bg-red-50 text-red-600',
  benefit: 'bg-emerald-50 text-emerald-600',
  system: 'bg-gray-100 text-gray-600',
};

export default function NotificationBell({ userEmail, userSubscription }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: notifs = [] } = useQuery({
    queryKey: ['user-notifs', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      const all = await base44.entities.UserNotification.filter({ created_by: userEmail }, '-created_date', 50);
      return all;
    },
    enabled: !!userEmail,
    refetchInterval: 30000,
  });

  const unreadCount = notifs.filter((n) => !n.read).length;

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.UserNotification.update(id, { read: true }),
    onSuccess: () => qc.invalidateQueries(['user-notifs', userEmail]),
  });

  const markAllRead = async () => {
    const unread = notifs.filter((n) => !n.read);
    await Promise.all(unread.map((n) => base44.entities.UserNotification.update(n.id, { read: true })));
    qc.invalidateQueries(['user-notifs', userEmail]);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[80]" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 w-80 bg-card rounded-2xl shadow-2xl border border-border z-[90] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">Notificações</span>
                  {unreadCount > 0 && (
                    <Badge className="text-[10px] bg-destructive text-white h-4 px-1.5">{unreadCount}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[10px] text-primary hover:underline">
                      Marcar todas
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center ml-2">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Nenhuma notificação</p>
                  </div>
                ) : (
                  notifs.map((n) => {
                    const Icon = typeIcons[n.type] || Bell;
                    return (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${n.read ? 'opacity-60' : ''}`}
                        onClick={() => !n.read && markReadMutation.mutate(n.id)}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${typeBg[n.type] || 'bg-muted text-muted-foreground'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className={`text-xs font-semibold line-clamp-1 ${n.read ? '' : 'text-foreground'}`}>{n.title}</p>
                            {!n.read && <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-0.5" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                          {n.sent_at && (
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                              {new Date(n.sent_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}