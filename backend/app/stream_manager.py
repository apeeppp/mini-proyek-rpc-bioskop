import queue, threading
class StreamManager:
    def __init__(self): self.lock=threading.Lock(); self.subscribers={}
    def subscribe(self, show_id):
        q=queue.Queue(maxsize=100)
        with self.lock: self.subscribers.setdefault(show_id,set()).add(q)
        return q
    def unsubscribe(self, show_id,q):
        with self.lock: self.subscribers.get(show_id,set()).discard(q)
    def publish(self, show_id,event):
        with self.lock: targets=list(self.subscribers.get(show_id,()))
        for q in targets:
            try: q.put_nowait(event)
            except queue.Full:
                try: q.get_nowait(); q.put_nowait(event)
                except queue.Empty: pass
