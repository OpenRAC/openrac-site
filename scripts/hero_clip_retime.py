# hero_clip_retime.py SRC START OUT (needs: pip install av opencv-python-headless numpy): 9 s of a 120 fps recording -> VFR intermediate at half speed,
# duplicate frames dropped and the rest re-timed so the camera moves at an even pace.
import sys, av, numpy as np, cv2
from fractions import Fraction
src, start, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
DUR, W, H = 9.0, 480, 270

def frames():
    c = av.open(src); s = c.streams.video[0]; s.thread_type = "AUTO"
    c.seek(int((start - 1) / s.time_base), stream=s)
    n = 0
    for f in c.decode(s):
        t = float(f.pts * s.time_base)
        if t < start - 1e-4: continue
        if n >= int(DUR * 120): break
        n += 1
        yield f
    c.close()

# pass 1: camera motion between frames (90th percentile of optical flow)
prev = None; m = []
for f in frames():
    g = cv2.resize(f.to_ndarray(format="gray"), (W, H), interpolation=cv2.INTER_AREA)
    if prev is not None:
        fl = cv2.calcOpticalFlowFarneback(prev, g, None, 0.5, 3, 15, 3, 5, 1.2, 0)
        m.append(float(np.percentile(np.hypot(fl[..., 0], fl[..., 1]), 90)))
    prev = g
m = np.array(m); N = len(m) + 1
loc = np.array([np.median(m[max(0, i - 8):i + 9]) for i in range(len(m))])
keep = np.ones(N, bool); keep[1:] = m / np.maximum(loc, 1e-3) >= 0.8  # a frame barely moved from the last: a repeat
t = np.arange(N) / 120.0
C = np.concatenate([[0], np.cumsum(m)])  # where the camera is, in pixels travelled
# even pace: the travelled distance as a smooth function of time; a frame goes to the time the smooth curve reaches its position
sig = 12
k = np.exp(-0.5 * (np.arange(-3 * sig, 3 * sig + 1) / sig) ** 2); k /= k.sum()
Cp = np.pad(C, 3 * sig, mode="reflect", reflect_type="odd")
S = np.maximum.accumulate(np.convolve(Cp, k, mode="valid"))
tn = np.interp(C, S, t) if S[-1] > S[0] else t.copy()
tn = t + np.clip(tn - t, -1.5 / 120, 1.5 / 120)  # only fix pacing, never drift away from the real time
idx = np.flatnonzero(keep)
tk = tn[idx]
ok = np.concatenate([[True], np.diff(tk) > 0.2 / 120])
idx, tk = idx[ok], tk[ok]
print(f"{src}: {N} frames, dropped {N - len(idx)} repeats", flush=True)

# pass 2: write the kept frames at their new times, doubled (half speed)
o = av.open(out, "w")
vs = o.add_stream("libx264", options={"crf": "8", "preset": "veryfast"})
vs.width, vs.height, vs.pix_fmt = 1920, 1080, "yuv420p"
TB = Fraction(1, 120000); vs.codec_context.time_base = TB
want = dict(zip(idx.tolist(), tk.tolist()))
for i, f in enumerate(frames()):
    if i not in want: continue
    nf = f.reformat(width=1920, height=1080, format="yuv420p")
    nf.pts = int(round(want[i] * 2 * 120000)); nf.time_base = TB
    for p in vs.encode(nf): o.mux(p)
for p in vs.encode(): o.mux(p)
o.close()
np.save(out + ".m.npy", m)
