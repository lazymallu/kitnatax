# Independent reference written from the department's rate tables, not from engine.js.
# Numbers are read from the rules data file; the calculation logic is written separately from engine.js.
import json, sys, os
YEAR=os.environ.get('TAX_YEAR') or json.load(open(os.path.join(os.path.dirname(__file__),'..','rules','current.json')))['current']
RJ=json.load(open(os.path.join(os.path.dirname(__file__),'..','rules',YEAR+'.json')))
def r10(x): return int((x+5)//10*10) if x>=0 else 0
def bands(sl):
    out,lo=[],0
    for hi,rate in sl:
        hi=10**15 if hi is None else hi; out.append((lo,hi,rate*100)); lo=hi
    return out
NEW=bands(RJ['newRegime']['slabs'])
OLD={k:bands(v) for k,v in RJ['oldRegime']['slabs'].items()}
N,O,L=RJ['newRegime'],RJ['oldRegime'],RJ['oldRegime']['limits']
def slab(x,t): return sum(max(0,min(x,hi)-lo)*r/100 for lo,hi,r in t)
def sur_rate(x,bands):
    r=0
    for t,rate in bands:
        if x>t: r=rate
    return r
def with_sur(x,t,bands):
    base=slab(x,t); r=sur_rate(x,bands)
    if r==0: return base,0
    # threshold = highest band crossed
    T=max(th for th,_ in bands if x>th)
    atT=slab(T,t)*(1+sur_rate(T,bands))
    tot=min(base*(1+r), atT+(x-T))
    return base, tot-base
def tax_new(ti):
    ti=r10(max(0,ti)); s=slab(ti,NEW)
    if ti<=N['rebateLimit']: reb=min(s,N['rebateMax'])
    else: reb=max(0,s-(ti-N['rebateLimit']))
    sb=[tuple(b) for b in N['surcharge']]
    _,sur=with_sur(ti,NEW,sb) if ti>sb[0][0] else (0,0)
    return r10((s-reb+sur)*(1+RJ['cess']))
def tax_old(ti,age):
    ti=r10(max(0,ti)); t=OLD[age]; s=slab(ti,t)
    reb=min(s,O['rebateMax']) if ti<=O['rebateLimit'] else 0
    sb=[tuple(b) for b in O['surcharge']]
    _,sur=with_sur(ti,t,sb) if ti>sb[0][0] else (0,0)
    return r10((s-reb+sur)*(1+RJ['cess']))
def calc(i):
    g=lambda k:max(0,float(i.get(k) or 0))
    age=i.get('age','below60'); sen=age!='below60'
    gross=g('gross'); basic=g('basic')
    newti=gross+g('interest')-min(N['sd'],gross)-min(g('employerNps'),N['employerNpsPct']*basic)
    hra=0
    if g('hraReceived') and g('rentPaid'):
        hra=max(0,min(g('hraReceived'),g('rentPaid')-.1*basic,(.5 if i.get('metro') else .4)*basic))
    d=(hra+min(g('profTax'),L['profTax'])+min(g('homeLoan'),L['homeLoan'])+min(g('c80'),L['c80'])+min(g('ownNps'),L['ccd1b'])
       +min(g('employerNps'),O['employerNpsPct']*basic)+min(g('healthSelf'),L['d80SelfSenior'] if sen else L['d80Self'])
       +min(g('healthParents'),L['d80ParentsSenior'] if i.get('parentsSenior') else L['d80Parents'])+g('eduLoan')
       +min(g('interest'),L['ttb'] if sen else L['tta']))
    oldti=gross+g('interest')-min(O['sd'],gross)-d
    return tax_new(newti), tax_old(oldti,age)
cases=json.load(sys.stdin)
print(json.dumps([calc(c) for c in cases]))
