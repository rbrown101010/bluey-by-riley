/*!
 * <keramik-avatar> – animierter KI-Assistent als Web Component
 * Erzeugt aus dem Design-Board "F · Keramik Morph". Keine Abhängigkeiten.
 *
 * Nutzung:
 *   <script type="module" src="./keramik-avatar.js"></script>
 *   <keramik-avatar boot style="--ka-size: 320px"></keramik-avatar>
 *   document.querySelector('keramik-avatar').react('stop');
 */
const KA_CSS = `
:host { display: inline-block; width: var(--ka-size, 300px); aspect-ratio: 280 / 260; font-family: Inter, system-ui, -apple-system, sans-serif; }
svg.ka { width: 100%; height: 100%; display: block; overflow: visible; }
.hud{transform-box:fill-box;transform-origin:0% 100%;animation:hudIn .55s cubic-bezier(.2,.9,.3,1.25) both}
.scan{animation:scan 2s linear infinite}
.bar{transform-box:fill-box;transform-origin:0% 50%;animation:bar 2.6s ease-in-out infinite}
.blink{animation:blink 1s steps(2) infinite}
.beam{animation:beam 1.2s ease-in-out infinite alternate}
.row{opacity:0;animation:rowIn .4s ease-out forwards}
.r1{animation-delay:.5s}.r2{animation-delay:.9s}.r3{animation-delay:1.3s}
.glyph{transform-box:fill-box;transform-origin:50% 50%;animation:pulse 1.3s ease-in-out infinite}
.z{transform-box:fill-box;opacity:0;animation:zz 2.4s ease-out infinite}
.z2{animation-delay:.8s}.z3{animation-delay:1.6s}
.hud2{transform-box:fill-box;transform-origin:50% 0%;animation:hudIn2 .7s cubic-bezier(.2,.9,.3,1.15) both}
.sweep{animation:sweep 2.6s ease-in-out infinite}
@keyframes hudIn2{0%{opacity:0;transform:scale(.15,.05)}40%{opacity:1;transform:scale(1,.08)}100%{opacity:1;transform:scale(1,1)}}
@keyframes sweep{from{transform:translateX(0)}to{transform:translateX(250px)}}
.pop{transform-box:fill-box;transform-origin:50% 100%;animation:popIn .6s cubic-bezier(.2,.9,.3,1.4) both}
.wave{transform-box:fill-box;transform-origin:50% 100%;animation:wave 1.4s ease-in-out .6s infinite}
.shake{transform-box:fill-box;transform-origin:50% 50%;animation:shake .35s ease-in-out infinite}
.rays{animation:blink 1.2s ease-in-out infinite}
.steam{opacity:0;animation:steam 2s ease-in-out infinite}.s2{animation-delay:.8s}
.conf{transform-box:fill-box;transform-origin:50% 50%;opacity:0;animation:conf 1.8s ease-in infinite}
@keyframes popIn{from{opacity:0;transform:scale(.2) rotate(-20deg)}to{opacity:1;transform:scale(1) rotate(0)}}
@keyframes wave{0%,100%{transform:rotate(0)}50%{transform:rotate(7deg)}}
@keyframes shake{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(12deg)}}
@keyframes steam{0%{opacity:0;transform:translateY(4px)}40%{opacity:.9}100%{opacity:0;transform:translateY(-8px)}}
@keyframes conf{0%{opacity:0;transform:translateY(-6px) rotate(0)}15%{opacity:1}100%{opacity:0;transform:translateY(80px) rotate(320deg)}}
.cf{transform-box:fill-box;transform-origin:50% 50%;opacity:0}
.door{transform-box:fill-box;transform-origin:50% 100%;animation:doorOpen .3s ease-in forwards}
.lid{transform-box:fill-box;transform-origin:0% 50%;animation:lidOpen .3s ease-in forwards}
.slot{opacity:0;animation:fadeIn .2s ease-out forwards}
.arm{stroke-dasharray:110;stroke-dashoffset:110;animation:armOut .45s .2s ease-out forwards}
.pop2{transform-box:fill-box;transform-origin:50% 100%;opacity:0;animation:popIn .5s .55s cubic-bezier(.2,.9,.3,1.4) forwards}
.halo{transform-box:fill-box;transform-origin:50% 50%;animation:halo 1.6s ease-in-out infinite}
.recoil{animation:recoil 2.6s .6s ease-out infinite}
.flash{transform-box:fill-box;transform-origin:50% 50%;opacity:0;animation:flash 2.6s .6s ease-out infinite}
.wisp{stroke-dasharray:26;stroke-dashoffset:26;opacity:0;animation:wisp 2.8s ease-in-out infinite}
.w2{animation-delay:.9s}.w3{animation-delay:1.8s}
.sip{transform-box:fill-box;transform-origin:20% 100%;animation:sip 4s 1.2s ease-in-out infinite}
.blink2{animation:blink2 .9s steps(2) infinite}
.alarm{animation:blink2 .5s steps(2) infinite}
@keyframes doorOpen{to{transform:scaleY(0);opacity:0}}
@keyframes lidOpen{to{transform:scaleX(0);opacity:0}}
@keyframes fadeIn{to{opacity:1}}
@keyframes armOut{to{stroke-dashoffset:0}}
@keyframes halo{0%,100%{opacity:.35;transform:scale(.9)}50%{opacity:.7;transform:scale(1.15)}}
@keyframes recoil{0%{transform:translateX(0)}4%{transform:translateX(-6px)}14%{transform:translateX(0)}100%{transform:translateX(0)}}
@keyframes flash{0%{opacity:0;transform:scale(.3)}3%{opacity:1;transform:scale(1.3)}12%{opacity:0;transform:scale(1.8)}100%{opacity:0}}
@keyframes wisp{0%{stroke-dashoffset:26;opacity:0}30%{opacity:.85}100%{stroke-dashoffset:-26;opacity:0}}
@keyframes sip{0%,70%,100%{transform:rotate(0deg)}80%,90%{transform:rotate(-14deg)}}
@keyframes blink2{50%{opacity:.25}}
@keyframes ck0{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-180px,-165px) rotate(127deg)}85%{opacity:1}100%{opacity:0;transform:translate(-171px,134px) rotate(581deg)}}
.c0{animation:ck0 2.6s cubic-bezier(.15,.7,.4,1) 0.61s infinite}
@keyframes ck1{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-278px,-108px) rotate(312deg)}85%{opacity:1}100%{opacity:0;transform:translate(-306px,191px) rotate(706deg)}}
.c1{animation:ck1 2.6s cubic-bezier(.15,.7,.4,1) 0.61s infinite}
@keyframes ck2{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-96px,-180px) rotate(204deg)}85%{opacity:1}100%{opacity:0;transform:translate(-92px,119px) rotate(706deg)}}
.c2{animation:ck2 2.6s cubic-bezier(.15,.7,.4,1) 0.65s infinite}
@keyframes ck3{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-86px,-126px) rotate(113deg)}85%{opacity:1}100%{opacity:0;transform:translate(-57px,173px) rotate(578deg)}}
.c3{animation:ck3 2.6s cubic-bezier(.15,.7,.4,1) 0.67s infinite}
@keyframes ck4{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-144px,-103px) rotate(182deg)}85%{opacity:1}100%{opacity:0;transform:translate(-140px,196px) rotate(414deg)}}
.c4{animation:ck4 2.6s cubic-bezier(.15,.7,.4,1) 0.65s infinite}
@keyframes ck5{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-230px,-174px) rotate(120deg)}85%{opacity:1}100%{opacity:0;transform:translate(-217px,125px) rotate(616deg)}}
.c5{animation:ck5 2.6s cubic-bezier(.15,.7,.4,1) 0.62s infinite}
@keyframes ck6{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-103px,-65px) rotate(322deg)}85%{opacity:1}100%{opacity:0;transform:translate(-105px,234px) rotate(687deg)}}
.c6{animation:ck6 2.6s cubic-bezier(.15,.7,.4,1) 0.62s infinite}
@keyframes ck7{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-41px,-150px) rotate(358deg)}85%{opacity:1}100%{opacity:0;transform:translate(-36px,149px) rotate(791deg)}}
.c7{animation:ck7 2.6s cubic-bezier(.15,.7,.4,1) 0.67s infinite}
@keyframes ck8{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-133px,-92px) rotate(352deg)}85%{opacity:1}100%{opacity:0;transform:translate(-159px,207px) rotate(746deg)}}
.c8{animation:ck8 2.6s cubic-bezier(.15,.7,.4,1) 0.61s infinite}
@keyframes ck9{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-243px,-111px) rotate(129deg)}85%{opacity:1}100%{opacity:0;transform:translate(-271px,188px) rotate(594deg)}}
.c9{animation:ck9 2.6s cubic-bezier(.15,.7,.4,1) 0.65s infinite}
@keyframes ck10{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-174px,-133px) rotate(323deg)}85%{opacity:1}100%{opacity:0;transform:translate(-174px,166px) rotate(538deg)}}
.c10{animation:ck10 2.6s cubic-bezier(.15,.7,.4,1) 0.67s infinite}
@keyframes ck11{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-124px,-83px) rotate(248deg)}85%{opacity:1}100%{opacity:0;transform:translate(-150px,216px) rotate(759deg)}}
.c11{animation:ck11 2.6s cubic-bezier(.15,.7,.4,1) 0.65s infinite}
@keyframes ck12{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(4px,-144px) rotate(267deg)}85%{opacity:1}100%{opacity:0;transform:translate(-2px,155px) rotate(458deg)}}
.c12{animation:ck12 2.6s cubic-bezier(.15,.7,.4,1) 0.68s infinite}
@keyframes ck13{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-237px,-171px) rotate(237deg)}85%{opacity:1}100%{opacity:0;transform:translate(-264px,128px) rotate(483deg)}}
.c13{animation:ck13 2.6s cubic-bezier(.15,.7,.4,1) 0.66s infinite}
@keyframes ck14{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-155px,-50px) rotate(319deg)}85%{opacity:1}100%{opacity:0;transform:translate(-180px,249px) rotate(704deg)}}
.c14{animation:ck14 2.6s cubic-bezier(.15,.7,.4,1) 0.64s infinite}
@keyframes ck15{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(3px,-51px) rotate(302deg)}85%{opacity:1}100%{opacity:0;transform:translate(-10px,248px) rotate(665deg)}}
.c15{animation:ck15 2.6s cubic-bezier(.15,.7,.4,1) 0.65s infinite}
@keyframes ck16{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(54px,-165px) rotate(208deg)}85%{opacity:1}100%{opacity:0;transform:translate(34px,134px) rotate(725deg)}}
.c16{animation:ck16 2.6s cubic-bezier(.15,.7,.4,1) 0.62s infinite}
@keyframes ck17{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(7px,-160px) rotate(164deg)}85%{opacity:1}100%{opacity:0;transform:translate(-5px,139px) rotate(558deg)}}
.c17{animation:ck17 2.6s cubic-bezier(.15,.7,.4,1) 0.64s infinite}
@keyframes ck18{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-90px,-37px) rotate(353deg)}85%{opacity:1}100%{opacity:0;transform:translate(-79px,262px) rotate(849deg)}}
.c18{animation:ck18 2.6s cubic-bezier(.15,.7,.4,1) 0.65s infinite}
@keyframes ck19{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-280px,-46px) rotate(290deg)}85%{opacity:1}100%{opacity:0;transform:translate(-263px,253px) rotate(673deg)}}
.c19{animation:ck19 2.6s cubic-bezier(.15,.7,.4,1) 0.63s infinite}
@keyframes ck20{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-121px,-125px) rotate(196deg)}85%{opacity:1}100%{opacity:0;transform:translate(-140px,174px) rotate(601deg)}}
.c20{animation:ck20 2.6s cubic-bezier(.15,.7,.4,1) 0.61s infinite}
@keyframes ck21{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-77px,-173px) rotate(141deg)}85%{opacity:1}100%{opacity:0;transform:translate(-73px,126px) rotate(507deg)}}
.c21{animation:ck21 2.6s cubic-bezier(.15,.7,.4,1) 0.65s infinite}
@keyframes ck22{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(23px,-91px) rotate(219deg)}85%{opacity:1}100%{opacity:0;transform:translate(2px,208px) rotate(576deg)}}
.c22{animation:ck22 2.6s cubic-bezier(.15,.7,.4,1) 0.65s infinite}
@keyframes ck23{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-254px,-54px) rotate(328deg)}85%{opacity:1}100%{opacity:0;transform:translate(-224px,245px) rotate(753deg)}}
.c23{animation:ck23 2.6s cubic-bezier(.15,.7,.4,1) 0.64s infinite}
@keyframes ck24{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-246px,-70px) rotate(335deg)}85%{opacity:1}100%{opacity:0;transform:translate(-232px,229px) rotate(869deg)}}
.c24{animation:ck24 2.6s cubic-bezier(.15,.7,.4,1) 0.61s infinite}
@keyframes ck25{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-224px,-37px) rotate(103deg)}85%{opacity:1}100%{opacity:0;transform:translate(-232px,262px) rotate(553deg)}}
.c25{animation:ck25 2.6s cubic-bezier(.15,.7,.4,1) 0.62s infinite}
@keyframes ck26{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(19px,-78px) rotate(277deg)}85%{opacity:1}100%{opacity:0;transform:translate(5px,221px) rotate(542deg)}}
.c26{animation:ck26 2.6s cubic-bezier(.15,.7,.4,1) 0.63s infinite}
@keyframes ck27{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-102px,-65px) rotate(204deg)}85%{opacity:1}100%{opacity:0;transform:translate(-113px,234px) rotate(697deg)}}
.c27{animation:ck27 2.6s cubic-bezier(.15,.7,.4,1) 0.66s infinite}
@keyframes ck28{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-1px,-59px) rotate(206deg)}85%{opacity:1}100%{opacity:0;transform:translate(12px,240px) rotate(488deg)}}
.c28{animation:ck28 2.6s cubic-bezier(.15,.7,.4,1) 0.64s infinite}
@keyframes ck29{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-29px,-31px) rotate(331deg)}85%{opacity:1}100%{opacity:0;transform:translate(-12px,268px) rotate(643deg)}}
.c29{animation:ck29 2.6s cubic-bezier(.15,.7,.4,1) 0.62s infinite}
@keyframes ck30{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(53px,-118px) rotate(268deg)}85%{opacity:1}100%{opacity:0;transform:translate(80px,181px) rotate(634deg)}}
.c30{animation:ck30 2.6s cubic-bezier(.15,.7,.4,1) 0.61s infinite}
@keyframes ck31{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-216px,-158px) rotate(90deg)}85%{opacity:1}100%{opacity:0;transform:translate(-233px,141px) rotate(515deg)}}
.c31{animation:ck31 2.6s cubic-bezier(.15,.7,.4,1) 0.67s infinite}
@keyframes ck32{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-4px,-176px) rotate(288deg)}85%{opacity:1}100%{opacity:0;transform:translate(5px,123px) rotate(570deg)}}
.c32{animation:ck32 2.6s cubic-bezier(.15,.7,.4,1) 0.64s infinite}
@keyframes ck33{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-139px,-88px) rotate(292deg)}85%{opacity:1}100%{opacity:0;transform:translate(-164px,211px) rotate(709deg)}}
.c33{animation:ck33 2.6s cubic-bezier(.15,.7,.4,1) 0.63s infinite}
@keyframes ck34{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-31px,-162px) rotate(167deg)}85%{opacity:1}100%{opacity:0;transform:translate(-54px,137px) rotate(649deg)}}
.c34{animation:ck34 2.6s cubic-bezier(.15,.7,.4,1) 0.67s infinite}
@keyframes ck35{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-245px,-57px) rotate(269deg)}85%{opacity:1}100%{opacity:0;transform:translate(-217px,242px) rotate(528deg)}}
.c35{animation:ck35 2.6s cubic-bezier(.15,.7,.4,1) 0.64s infinite}
@keyframes ck36{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-292px,-62px) rotate(142deg)}85%{opacity:1}100%{opacity:0;transform:translate(-278px,237px) rotate(591deg)}}
.c36{animation:ck36 2.6s cubic-bezier(.15,.7,.4,1) 0.66s infinite}
@keyframes ck37{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-139px,-50px) rotate(198deg)}85%{opacity:1}100%{opacity:0;transform:translate(-119px,249px) rotate(392deg)}}
.c37{animation:ck37 2.6s cubic-bezier(.15,.7,.4,1) 0.62s infinite}
@keyframes ck38{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-114px,-67px) rotate(304deg)}85%{opacity:1}100%{opacity:0;transform:translate(-125px,232px) rotate(551deg)}}
.c38{animation:ck38 2.6s cubic-bezier(.15,.7,.4,1) 0.60s infinite}
@keyframes ck39{0%{opacity:0;transform:translate(0px,0px) rotate(0deg)}4%{opacity:1}30%{transform:translate(-169px,-116px) rotate(354deg)}85%{opacity:1}100%{opacity:0;transform:translate(-164px,183px) rotate(749deg)}}
.c39{animation:ck39 2.6s cubic-bezier(.15,.7,.4,1) 0.67s infinite}
@keyframes tq{0%,3%{transform:scaleX(0);animation-timing-function:steps(18,end)}26%,100%{transform:scaleX(1)}}
.tq{transform-box:fill-box;transform-origin:0% 50%;animation:tq 7s infinite}
@keyframes caretQ{0%,26%{opacity:0}27%,100%{opacity:1}}.caretQ{opacity:0;animation:caretQ 7s infinite}
@keyframes hlS{0%,62%{opacity:0;transform:translateY(0)}64%,72%{opacity:1;transform:translateY(0)}76%,84%{opacity:1;transform:translateY(14px)}88%,96%{opacity:1;transform:translateY(28px)}100%{opacity:0;transform:translateY(28px)}}.hlS{opacity:0;animation:hlS 7s ease-in-out infinite}
@keyframes sr0{0%,34%{opacity:0;transform:translateY(3px)}38%,96%{opacity:1;transform:translateY(0)}100%{opacity:0}}
.sr0{transform-box:fill-box;opacity:0;animation:sr0 7s ease-out infinite}
@keyframes sr1{0%,42%{opacity:0;transform:translateY(3px)}46%,96%{opacity:1;transform:translateY(0)}100%{opacity:0}}
.sr1{transform-box:fill-box;opacity:0;animation:sr1 7s ease-out infinite}
@keyframes sr2{0%,50%{opacity:0;transform:translateY(3px)}54%,96%{opacity:1;transform:translateY(0)}100%{opacity:0}}
.sr2{transform-box:fill-box;opacity:0;animation:sr2 7s ease-out infinite}
@keyframes scrollT{0%,55%{transform:translateY(0)}75%,92%{transform:translateY(-30px)}100%{transform:translateY(0)}}.scrollT{animation:scrollT 7s ease-in-out infinite}
@keyframes hlT{0%,26%{transform:translateY(0)}32%,40%{transform:translateY(11px)}46%,92%{transform:translateY(22px)}100%{transform:translateY(0)}}.hlT{animation:hlT 7s ease-in-out infinite}
@keyframes ck0T{0%,16%{stroke-dashoffset:20}20%,100%{stroke-dashoffset:0}}
.ck0T{stroke-dasharray:20;stroke-dashoffset:20;animation:ck0T 7s ease-out infinite}
@keyframes st0T{0%,19%{transform:scaleX(0)}24%,100%{transform:scaleX(1)}}
.st0T{transform-box:fill-box;transform-origin:0% 50%;animation:st0T 7s ease-out infinite}
@keyframes ck1T{0%,36%{stroke-dashoffset:20}40%,100%{stroke-dashoffset:0}}
.ck1T{stroke-dasharray:20;stroke-dashoffset:20;animation:ck1T 7s ease-out infinite}
@keyframes st1T{0%,39%{transform:scaleX(0)}44%,100%{transform:scaleX(1)}}
.st1T{transform-box:fill-box;transform-origin:0% 50%;animation:st1T 7s ease-out infinite}
@keyframes ck2T{0%,50%{stroke-dashoffset:20}54%,100%{stroke-dashoffset:0}}
.ck2T{stroke-dasharray:20;stroke-dashoffset:20;animation:ck2T 7s ease-out infinite}
@keyframes st2T{0%,53%{transform:scaleX(0)}58%,100%{transform:scaleX(1)}}
.st2T{transform-box:fill-box;transform-origin:0% 50%;animation:st2T 7s ease-out infinite}
@keyframes hlM{0%,6%{opacity:0;transform:translateY(0)}8%,20%{opacity:1;transform:translateY(0)}26%,38%{opacity:1;transform:translateY(15px)}44%,56%{opacity:1;transform:translateY(30px)}62%,74%{opacity:1;transform:translateY(45px)}80%,100%{opacity:0;transform:translateY(45px)}}.hlM{opacity:0;animation:hlM 7s ease-in-out infinite}
@keyframes dt0{0%,16%{opacity:1}19%,96%{opacity:0}100%{opacity:1}}.dt0{animation:dt0 7s infinite}
@keyframes dt1{0%,34%{opacity:1}37%,96%{opacity:0}100%{opacity:1}}.dt1{animation:dt1 7s infinite}
@keyframes dt2{0%,52%{opacity:1}55%,96%{opacity:0}100%{opacity:1}}.dt2{animation:dt2 7s infinite}
@keyframes dt3{0%,70%{opacity:1}73%,96%{opacity:0}100%{opacity:1}}.dt3{animation:dt3 7s infinite}
@keyframes tagM{0%,40%{opacity:0;transform:translateY(3px)}44%,96%{opacity:1;transform:translateY(0)}100%{opacity:0}}
.tagM{transform-box:fill-box;opacity:0;animation:tagM 7s ease-out infinite}
@keyframes ev0{0%,8%{opacity:0;transform:scale(.4)}12%,96%{opacity:1;transform:scale(1)}100%{opacity:0}}.ev0{transform-box:fill-box;transform-origin:50% 50%;opacity:0;animation:ev0 7s cubic-bezier(.2,.9,.3,1.3) infinite}
@keyframes ev1{0%,16%{opacity:0;transform:scale(.4)}20%,96%{opacity:1;transform:scale(1)}100%{opacity:0}}.ev1{transform-box:fill-box;transform-origin:50% 50%;opacity:0;animation:ev1 7s cubic-bezier(.2,.9,.3,1.3) infinite}
@keyframes ev2{0%,24%{opacity:0;transform:scale(.4)}28%,96%{opacity:1;transform:scale(1)}100%{opacity:0}}.ev2{transform-box:fill-box;transform-origin:50% 50%;opacity:0;animation:ev2 7s cubic-bezier(.2,.9,.3,1.3) infinite}
@keyframes ev3{0%,32%{opacity:0;transform:scale(.4)}36%,96%{opacity:1;transform:scale(1)}100%{opacity:0}}.ev3{transform-box:fill-box;transform-origin:50% 50%;opacity:0;animation:ev3 7s cubic-bezier(.2,.9,.3,1.3) infinite}
@keyframes ev4{0%,40%{opacity:0;transform:scale(.4)}44%,96%{opacity:1;transform:scale(1)}100%{opacity:0}}.ev4{transform-box:fill-box;transform-origin:50% 50%;opacity:0;animation:ev4 7s cubic-bezier(.2,.9,.3,1.3) infinite}
@keyframes clash{0%,50%{opacity:0;transform:translateY(0)}54%,64%{opacity:1;transform:translateY(0)}72%,96%{opacity:1;transform:translateY(22px)}100%{opacity:0;transform:translateY(22px)}}.clash{opacity:0;animation:clash 7s ease-in-out infinite}
@keyframes clashR{0%,52%{opacity:0}55%,66%{opacity:1}68%,100%{opacity:0}}.clashR{opacity:0;animation:clashR 7s steps(4) infinite}
@keyframes nowL{0%{transform:translateY(0)}100%{transform:translateY(48px)}}.nowL{animation:nowL 7s linear infinite}
@keyframes tl0{0%,2%{transform:scaleX(0);animation-timing-function:steps(12,end)}12%,100%{transform:scaleX(1)}}
.tl0{transform-box:fill-box;transform-origin:0% 50%;animation:tl0 7s infinite}
@keyframes tl1{0%,14%{transform:scaleX(0);animation-timing-function:steps(27,end)}34%,100%{transform:scaleX(1)}}
.tl1{transform-box:fill-box;transform-origin:0% 50%;animation:tl1 7s infinite}
@keyframes tl2{0%,38%{opacity:0;transform:translateY(3px)}41%,96%{opacity:1;transform:translateY(0)}100%{opacity:0}}
.tl2{transform-box:fill-box;opacity:0;animation:tl2 7s ease-out infinite}
@keyframes tl3{0%,44%{opacity:0;transform:translateY(3px)}47%,96%{opacity:1;transform:translateY(0)}100%{opacity:0}}
.tl3{transform-box:fill-box;opacity:0;animation:tl3 7s ease-out infinite}
@keyframes tlbar{0%,46%{transform:scaleX(0)}86%,100%{transform:scaleX(1)}}
.tlbar{transform-box:fill-box;transform-origin:0% 50%;animation:tlbar 7s ease-out infinite}
@keyframes tl4{0%,86%{opacity:0;transform:translateY(3px)}89%,96%{opacity:1;transform:translateY(0)}100%{opacity:0}}
.tl4{transform-box:fill-box;opacity:0;animation:tl4 7s ease-out infinite}
.armS{animation:armOut .8s .25s cubic-bezier(.3,.7,.3,1) forwards}
.armV{stroke-dasharray:20;stroke-dashoffset:20;animation:armV .5s .2s ease-out forwards}
@keyframes armV{to{stroke-dashoffset:0}}
.riseV{transform-box:fill-box;transform-origin:50% 100%;opacity:0;animation:riseV .6s .2s cubic-bezier(.3,.8,.3,1.25) forwards}
@keyframes riseV{0%{opacity:0;transform:translateY(26px) scale(.4)}20%{opacity:1}100%{opacity:1;transform:translateY(0) scale(1)}}
.rideS,.rideC,.rideK{transform-box:fill-box;transform-origin:50% 100%;opacity:0}
.rideS{animation:rideS .8s .25s cubic-bezier(.3,.7,.3,1.15) forwards}
.rideC{animation:rideC .8s .25s cubic-bezier(.3,.7,.3,1.15) forwards}
.rideK{animation:rideK .8s .25s cubic-bezier(.3,.7,.3,1.15) forwards}
@keyframes rideS{0%{opacity:0;transform:translate(-28px,40px) scale(.3)}12%{opacity:1}45%{transform:translate(0px,40px) scale(.55)}100%{opacity:1;transform:translate(0px,0px) scale(1)}}
@keyframes rideC{0%{opacity:0;transform:translate(-28px,26px) scale(.3)}12%{opacity:1}50%{transform:translate(0px,26px) scale(.6)}100%{opacity:1;transform:translate(0px,0px) scale(1)}}
@keyframes rideK{0%{opacity:0;transform:translate(-26px,14px) scale(.3)}12%{opacity:1}55%{transform:translate(0px,14px) scale(.7)}100%{opacity:1;transform:translate(0px,0px) scale(1)}}
.podL{transform-box:fill-box;animation:podL .45s ease-out both}.podR{transform-box:fill-box;animation:podR .45s ease-out both}
@keyframes podL{from{transform:translateX(12px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes podR{from{transform:translateX(-12px);opacity:0}to{transform:translateX(0);opacity:1}}
.ringDraw{stroke-dasharray:100;animation:ringDraw .7s ease-out both}
@keyframes ringDraw{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
.drift{animation:drift 3s ease-in-out infinite alternate}
@keyframes drift{from{transform:translateX(-1.5px)}to{transform:translateX(1.5px)}}
.glassIn{animation:glassIn .55s .1s cubic-bezier(.2,.9,.3,1.2) both}
@keyframes glassIn{from{opacity:0;transform:translateY(-40px)}to{opacity:1;transform:translateY(0)}}
.lensScan{animation:lensScan 1.6s .6s ease-in-out infinite}
@keyframes lensScan{0%{transform:translateY(0);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translateY(23px);opacity:0}}
.tw{transform-box:fill-box;transform-origin:50% 50%;animation:tw 1.4s ease-in-out infinite}.t2{animation-delay:.45s}.t3{animation-delay:.9s}
@keyframes tw{0%,100%{opacity:.2;transform:scale(.5) rotate(0)}50%{opacity:1;transform:scale(1.1) rotate(45deg)}}
.burst{transform-box:fill-box;transform-origin:50% 100%;animation:burst .9s ease-out infinite}
@keyframes burst{0%{opacity:0;transform:scale(.6)}30%{opacity:1}100%{opacity:0;transform:scale(1.25)}}
.spin{transform-box:fill-box;transform-origin:50% 50%;animation:spin 2.4s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.drop{transform-box:fill-box;animation:drop 1.6s ease-in infinite}
@keyframes drop{0%{opacity:0;transform:translateY(-4px)}20%{opacity:1}100%{opacity:0;transform:translateY(16px)}}
.dA,.dB,.dC{animation:blink 1.2s steps(2) infinite}.dB{animation-delay:.3s}.dC{animation-delay:.6s}
.rain{animation:rain .9s linear infinite}.r1{animation-delay:.2s}.r2{animation-delay:.45s}.r3{animation-delay:.7s}
@keyframes rain{from{transform:translateY(-30px);opacity:0}20%{opacity:.9}to{transform:translateY(110px);opacity:0}}
@keyframes hudIn{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:scale(1)}}
@keyframes scan{0%{transform:translateY(0);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(66px);opacity:0}}
@keyframes bar{0%{transform:scaleX(.05)}75%{transform:scaleX(1)}100%{transform:scaleX(1)}}
@keyframes blink{50%{opacity:.15}}
@keyframes beam{from{opacity:.35}to{opacity:1}}
@keyframes rowIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
@keyframes zz{0%{opacity:0;transform:translate(0,0) scale(.6)}20%{opacity:1}100%{opacity:0;transform:translate(14px,-34px) scale(1.15)}}
@media (prefers-reduced-motion: reduce){.hud,.hud2,.sweep,.scan,.bar,.blink,.beam,.row,.glyph,.z,.pop,.wave,.shake,.rays,.steam,.conf,.cf,.door,.lid,.slot,.arm,.pop2,.halo,.recoil,.flash,.wisp,.sip,.blink2,.alarm{animation:none;opacity:1;stroke-dashoffset:0}}
`;
const KA_SVG = `<svg class="ka" viewBox="-40 -40 280 260" role="img" aria-label="KI-Assistent" style="overflow: visible">
<defs><filter id="mg" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.5" result="b"></feGaussianBlur><feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter><clipPath id="plateclip"><rect data-bind-x="{{g.px}}" data-bind-y="{{g.py}}" data-bind-width="{{g.pw}}" data-bind-height="{{g.ph}}" data-bind-rx="{{g.pr}}"></rect></clipPath><clipPath id="bandclip"><path data-bind-d="{{hud.band}}"></path></clipPath><clipPath id="screenclip"><rect x="46" y="130" width="108" height="67" rx="4"></rect></clipPath><clipPath id="clipQ"><rect class="tq" x="64" y="133" width="82" height="10"></rect></clipPath><clipPath id="clipL0"><rect class="tl0" x="52" y="139" width="41.6" height="8"></rect></clipPath><clipPath id="clipL1"><rect class="tl1" x="52" y="147" width="91.1" height="8"></rect></clipPath></defs>
<ellipse data-bind-display="{{v.shadow}}" cx="100" data-bind-cy="{{g.shY}}" data-bind-rx="{{g.shRx}}" ry="6" fill="#000000" opacity="0.09"></ellipse>
<g data-bind-transform="{{f.tf}}">

<g data-bind-display="{{v.pods}}"><rect class="podL" data-bind-x="{{g.podL}}" data-bind-y="{{g.podY}}" width="16" height="44" rx="8" fill="#D1D1D6"></rect><rect class="podR" data-bind-x="{{g.podR}}" data-bind-y="{{g.podY}}" width="16" height="44" rx="8" fill="#D1D1D6"></rect></g>
<g data-bind-display="{{g.standDisp}}" data-bind-opacity="{{g.stand}}"><path data-bind-d="{{g.neckD}}" data-bind-fill="{{body}}" stroke="#E5E5EA" stroke-width="1.5"></path><rect x="64" data-bind-y="{{g.footY}}" width="72" height="10" rx="5" data-bind-fill="{{body}}" stroke="#E5E5EA" stroke-width="1.5"></rect></g>
<path data-bind-d="{{g.bodyD}}" data-bind-fill="{{body}}" stroke="#E5E5EA" stroke-width="1.5"></path>
<rect data-bind-x="{{g.px}}" data-bind-y="{{g.py}}" data-bind-width="{{g.pw}}" data-bind-height="{{g.ph}}" data-bind-rx="{{g.pr}}" fill="#16171A"></rect>
<rect class="ringDraw" pathLength="100" data-bind-display="{{v.ring}}" data-bind-x="{{g.rx}}" data-bind-y="{{g.ry}}" data-bind-width="{{g.rw}}" data-bind-height="{{g.rh}}" data-bind-rx="{{g.rr}}" fill="none" data-bind-stroke="{{glow}}" stroke-width="2" stroke-opacity="0.8" filter="url(#mg)"></rect>
<g data-bind-transform="{{g.hL.t}}">
<rect x="-2.5" y="-12" width="5" height="24" rx="2.5" fill="#16171A" data-bind-opacity="{{g.hL.slotO}}"></rect>
<rect x="-2.5" y="-12" width="5" height="24" rx="2.5" fill="none" stroke="#64D2FF" stroke-width="0.8" data-bind-opacity="{{g.hL.rimO}}"></rect>
<rect data-bind-transform="{{g.hL.doorT}}" data-bind-opacity="{{g.hL.doorO}}" x="-2.5" y="-12" width="5" height="24" rx="2.5" data-bind-fill="{{body}}" stroke="#DADADF" stroke-width="1"></rect>
</g>
<g data-bind-transform="{{g.hR.t}}">
<rect x="-2.5" y="-12" width="5" height="24" rx="2.5" fill="#16171A" data-bind-opacity="{{g.hR.slotO}}"></rect>
<rect x="-2.5" y="-12" width="5" height="24" rx="2.5" fill="none" stroke="#64D2FF" stroke-width="0.8" data-bind-opacity="{{g.hR.rimO}}"></rect>
<rect data-bind-transform="{{g.hR.doorT}}" data-bind-opacity="{{g.hR.doorO}}" x="-2.5" y="-12" width="5" height="24" rx="2.5" data-bind-fill="{{body}}" stroke="#DADADF" stroke-width="1"></rect>
</g>
<g data-bind-transform="{{g.topHT}}"><rect x="-10" y="-3" width="20" height="6" rx="3" data-bind-fill="{{body}}" stroke="#DADADF" stroke-width="1"></rect></g>
<path data-bind-d="{{g.reflD}}" fill="none" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="3" stroke-linecap="round"></path>
<g clip-path="url(#plateclip)">
<g filter="url(#mg)">
<g data-bind-transform="{{g.faceT}}" data-bind-display="{{v.face}}">
<path data-bind-d="{{f.pu}}" data-bind-opacity="{{f.eo}}" data-bind-fill="{{glow}}" data-bind-stroke="{{glow}}" stroke-width="1" stroke-linejoin="round"></path>
<path data-bind-d="{{f.brow}}" data-bind-opacity="{{f.bo}}" fill="none" data-bind-stroke="{{glow}}" stroke-width="3.5" stroke-linecap="round"></path>
<path data-bind-d="{{f.m}}" data-bind-opacity="{{f.mo}}" data-bind-fill="{{glow}}" data-bind-stroke="{{glow}}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>
</g>
<g data-bind-transform="{{g.faceT}}" data-bind-display="{{v.bootBar}}">
<radialGradient id="wakeG" cx="50%" cy="50%" r="50%"><stop offset="0%" data-bind-stop-color="{{glow}}" stop-opacity="0.55"></stop><stop offset="100%" data-bind-stop-color="{{glow}}" stop-opacity="0"></stop></radialGradient>
<ellipse cx="100" cy="96" data-bind-rx="{{bt.gr}}" data-bind-ry="{{bt.gry}}" fill="url(#wakeG)" data-bind-opacity="{{bt.go}}"></ellipse>
<rect data-bind-x="{{bt.tx}}" y="93.5" data-bind-width="{{bt.tw}}" height="5" rx="2.5" data-bind-fill="{{glow}}" data-bind-opacity="{{bt.to}}"></rect>
<text x="100" y="113" text-anchor="middle" font-size="6.5" font-weight="600" letter-spacing="0.8" data-bind-fill="{{glow}}" data-bind-opacity="{{bt.po}}" font-family="Inter, system-ui, sans-serif">{{bt.pct}}</text>
</g>
<g data-bind-transform="{{g.faceT}}" data-bind-display="{{v.battery}}">
<rect x="74" y="84" width="46" height="24" rx="6" fill="none" data-bind-stroke="{{glow}}" stroke-width="3"></rect>
<rect x="121.5" y="91" width="4" height="10" rx="2" data-bind-fill="{{glow}}"></rect>
<rect class="blink2" x="78.5" y="88.5" width="7" height="15" rx="2" fill="#FF453A"></rect>
<text x="100" y="124" text-anchor="middle" font-size="8.5" font-weight="700" letter-spacing="1.5" data-bind-fill="{{glow}}" font-family="Inter, system-ui, sans-serif">AKKU 5 %</text>
</g>
<g data-bind-transform="{{g.faceT}}" data-bind-display="{{v.crt}}">
<rect x="38" y="48" width="124" height="100" rx="24" data-bind-fill="{{glow}}" data-bind-opacity="{{g.ov}}" filter="url(#mg)"></rect>
</g>
<g data-bind-transform="{{g.faceT}}" data-bind-display="{{v.timer}}"><g class="blink2">
<text x="100" y="106" text-anchor="middle" font-size="30" font-weight="700" data-bind-fill="{{glow}}" font-family="Inter, system-ui, sans-serif">00:00</text>
<text x="100" y="124" text-anchor="middle" font-size="8.5" font-weight="700" letter-spacing="2" data-bind-fill="{{glow}}" font-family="Inter, system-ui, sans-serif">ABGELAUFEN</text>
</g></g>
<g data-bind-transform="{{g.symT}}">
<text data-bind-display="{{v.glyph}}" class="glyph" x="0" y="0" text-anchor="middle" font-size="20" font-weight="700" data-bind-fill="{{glow}}" font-family="Inter, system-ui, sans-serif">{{glyphText}}</text>
</g>
</g>
</g>
<g filter="url(#mg)">
<g data-bind-transform="{{g.symT}}">
<g data-bind-display="{{v.zzz}}">
<text class="z" x="-6" y="4" font-size="10" font-weight="700" data-bind-fill="{{glow}}" font-family="Inter, system-ui, sans-serif">z</text>
<text class="z z2" x="-6" y="4" font-size="13" font-weight="700" data-bind-fill="{{glow}}" font-family="Inter, system-ui, sans-serif">z</text>
<text class="z z3" x="-6" y="4" font-size="16" font-weight="700" data-bind-fill="{{glow}}" font-family="Inter, system-ui, sans-serif">Z</text>
</g>
<g data-bind-display="{{v.hearts}}">
<path class="z" d="M0 3 C -6 -2, -4 -8, 0 -5 C 4 -8, 6 -2, 0 3 Z" fill="#FF375F"></path>
<path class="z z2" d="M0 3.9000000000000004 C -7.800000000000001 -2.6, -5.2 -10.4, 0 -6.5 C 5.2 -10.4, 7.800000000000001 -2.6, 0 3.9000000000000004 Z" fill="#FF375F"></path>
<path class="z z3" d="M0 4.800000000000001 C -9.600000000000001 -3.2, -6.4 -12.8, 0 -8.0 C 6.4 -12.8, 9.600000000000001 -3.2, 0 4.800000000000001 Z" fill="#FF375F"></path>
</g>
</g>
</g>
<g data-bind-display="{{v.rain}}"><path class="rain r0" d="M-70 -50 l-2 7" stroke="#64D2FF" stroke-width="1.6" stroke-linecap="round"></path>
<path class="rain r1" d="M-56 -5 l-2 7" stroke="#64D2FF" stroke-width="1.6" stroke-linecap="round"></path>
<path class="rain r2" d="M-40 -11 l-2 7" stroke="#64D2FF" stroke-width="1.6" stroke-linecap="round"></path>
<path class="rain r3" d="M-26 -64 l-2 7" stroke="#64D2FF" stroke-width="1.6" stroke-linecap="round"></path>
<path class="rain r0" d="M-12 -33 l-2 7" stroke="#64D2FF" stroke-width="1.6" stroke-linecap="round"></path>
<path class="rain r1" d="M190 37 l-2 7" stroke="#64D2FF" stroke-width="1.6" stroke-linecap="round"></path>
<path class="rain r2" d="M204 -3 l-2 7" stroke="#64D2FF" stroke-width="1.6" stroke-linecap="round"></path>
<path class="rain r3" d="M218 -20 l-2 7" stroke="#64D2FF" stroke-width="1.6" stroke-linecap="round"></path>
<path class="rain r0" d="M232 0 l-2 7" stroke="#64D2FF" stroke-width="1.6" stroke-linecap="round"></path>
<path class="rain r1" d="M246 -6 l-2 7" stroke="#64D2FF" stroke-width="1.6" stroke-linecap="round"></path>
<path class="rain r2" d="M262 -72 l-2 7" stroke="#64D2FF" stroke-width="1.6" stroke-linecap="round"></path>
<path class="rain r3" d="M-62 -3 l-2 7" stroke="#64D2FF" stroke-width="1.6" stroke-linecap="round"></path>
<path class="rain r0" d="M212 -79 l-2 7" stroke="#64D2FF" stroke-width="1.6" stroke-linecap="round"></path>
<path class="rain r1" d="M-34 36 l-2 7" stroke="#64D2FF" stroke-width="1.6" stroke-linecap="round"></path></g>
<g data-bind-display="{{v.notes}}" data-bind-transform="{{g.trT}}">
<text class="z" x="2" y="0" font-size="15" font-weight="700" fill="#BF5AF2">♪</text>
<text class="z z2" x="-4" y="4" font-size="13" font-weight="700" fill="#0A84FF">♫</text>
<text class="z z3" x="6" y="2" font-size="16" font-weight="700" fill="#FF375F">♪</text>
</g>
<g data-bind-display="{{v.notes}}" data-bind-transform="{{g.tlT}}">
<text class="z z2" x="-14" y="2" font-size="13" font-weight="700" fill="#30D158">♫</text>
</g>
<g data-bind-display="{{v.dThink}}" data-bind-transform="{{g.trT}}"><g class="pop">
<circle cx="0" cy="2" r="2.6" fill="#FFFFFF" stroke="#D1D1D6" stroke-width="1"></circle>
<circle cx="7" cy="-6" r="4" fill="#FFFFFF" stroke="#D1D1D6" stroke-width="1"></circle>
<ellipse cx="22" cy="-21" rx="15" ry="10.5" fill="#FFFFFF" stroke="#D1D1D6" stroke-width="1"></ellipse>
<circle class="dA" cx="16" cy="-21" r="1.7" fill="#8E8E93"></circle><circle class="dB" cx="22" cy="-21" r="1.7" fill="#8E8E93"></circle><circle class="dC" cx="28" cy="-21" r="1.7" fill="#8E8E93"></circle>
</g></g>
<g data-bind-display="{{v.dHappy}}">
<g data-bind-transform="{{g.tlT}}"><g transform="translate(-18 14)"><path class="tw" d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z" fill="#FFD60A"></path></g><g transform="translate(6 -14) scale(.7)"><path class="tw t2" d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z" fill="#FFD60A"></path></g></g>
<g data-bind-transform="{{g.trT}}"><g transform="translate(18 22)"><path class="tw t3" d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z" fill="#FFD60A"></path></g><g transform="translate(-2 -16) scale(.8)"><path class="tw t2" d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z" fill="#FFD60A"></path></g></g>
</g>
<g data-bind-display="{{v.dWow}}" data-bind-transform="{{g.topT}}"><g class="burst">
<path d="M-30 8 L-38 2 M-17 -4 L-22 -12 M0 -8 V-17 M17 -4 L22 -12 M30 8 L38 2" stroke="#FF9F0A" stroke-width="2.6" stroke-linecap="round"></path>
</g></g>
<g data-bind-display="{{v.dFocus}}" data-bind-transform="{{g.trT}}"><g transform="translate(6 -8)"><g class="spin">
<circle r="7" fill="none" stroke="#AEAEB2" stroke-width="4.5" stroke-dasharray="3 2.5"></circle>
<circle r="5.2" fill="#AEAEB2"></circle><circle r="2.2" fill="#F5F5F7"></circle>
</g></g></g>
<g data-bind-display="{{v.dOops}}" data-bind-transform="{{g.tlT}}"><g transform="translate(2 22)"><path class="drop" d="M0 -6 C 4 0, 4 4, 0 5 C -4 4, -4 0, 0 -6 Z" fill="#64D2FF"></path></g></g>
<g data-bind-display="{{v.dWink}}" data-bind-transform="{{g.wsT}}"><path class="tw" d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z" fill="#FFD60A"></path></g>
<g data-bind-display="{{v.dMeh}}" data-bind-transform="{{g.topT}}"><g class="pop">
<path d="M-16 4 H14 A7 7 0 0 0 12 -9.5 A10 10 0 0 0 -7 -8 A6.5 6.5 0 0 0 -16 4 Z" fill="#8E8E93"></path>
<path class="blink2" d="M0 5 L-4 12 H0 L-2 18 L5 9 H1 L3 5 Z" fill="#FFD60A"></path>
</g></g>
<g data-bind-display="{{v.dConf}}" data-bind-transform="{{g.topT}}"><g class="spin">
<path d="M0 0 m-1 0 a1 1 0 1 1 2 0 a3 3 0 1 1 -6 0 a5 5 0 1 1 10 0 a7 7 0 1 1 -14 0" fill="none" stroke="#8E8E93" stroke-width="2" stroke-linecap="round"></path>
</g></g>
<g data-bind-transform="{{g.glT}}" data-bind-display="{{v.glasses}}"><g>
<rect x="63" y="83" width="34" height="26" rx="10" fill="#64D2FF" fill-opacity="0.22" stroke="#E5E5EA" stroke-width="2.2"></rect>
<rect x="103" y="83" width="34" height="26" rx="10" fill="#64D2FF" fill-opacity="0.22" stroke="#E5E5EA" stroke-width="2.2"></rect>
<path d="M97 91 Q100 87.5 103 91" fill="none" stroke="#E5E5EA" stroke-width="2.2" stroke-linecap="round"></path>
<path d="M68 101 L76 88 M108 101 L116 88" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="1.6" stroke-linecap="round"></path>
<circle class="blink" cx="131" cy="88" r="1.4" fill="#64D2FF"></circle>
</g></g>
<g data-bind-display="{{v.ant}}" data-bind-transform="{{g.topHT}}">
<rect data-bind-opacity="{{g.tslotO}}" x="-10" y="-3" width="20" height="6" rx="3" fill="#16171A"></rect>
<rect data-bind-transform="{{g.lidT}}" data-bind-opacity="{{g.lidO}}" x="-10" y="-3" width="20" height="6" rx="3" data-bind-fill="{{body}}" stroke="#DADADF" stroke-width="1"></rect>
<path d="M0 0 V-17" fill="none" stroke="#C7C7CC" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="17" data-bind-stroke-dashoffset="{{g.rodOff}}"></path>
<g data-bind-transform="{{g.lampT}}">
<g data-bind-display="{{v.ideaFx}}">
<circle class="halo" cx="0" cy="-27" r="17" fill="#FFD60A" opacity="0.45" filter="url(#mg)"></circle>
<path class="rays" d="M-15 -27 H-20 M15 -27 H20 M-11 -38 L-14.5 -41.5 M11 -38 L14.5 -41.5 M0 -42 V-47" stroke="#FFD60A" stroke-width="2" stroke-linecap="round"></path>
</g>
<rect x="-4.5" y="-20" width="9" height="4" rx="1.5" fill="#AEAEB2"></rect>
<circle data-bind-class="{{g.antClass}}" cx="0" cy="-27" data-bind-r="{{g.lampR}}" data-bind-fill="{{lamp}}" filter="url(#mg)"></circle>
<circle cx="-2.6" cy="-29.6" r="2" fill="#FFFFFF" opacity="0.75"></circle>
</g>
</g>
<g data-bind-display="{{g.aL.disp}}">
<path data-bind-d="{{g.aL.d}}" fill="none" stroke="#B8B8BE" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"></path>
<path data-bind-d="{{g.aL.d}}" fill="none" stroke="#E5E5EA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
<circle data-bind-cx="{{g.aL.sx}}" data-bind-cy="{{g.aL.sy}}" r="3.4" fill="#8E8E93"></circle>
<circle data-bind-cx="{{g.aL.ex}}" data-bind-cy="{{g.aL.ey}}" r="3.8" fill="#AEAEB2" stroke="#8E8E93" stroke-width="1"></circle>
<g data-bind-transform="{{g.aL.handT}}"><rect x="-2" y="-5" width="10" height="10" rx="3.5" data-bind-fill="{{body}}" stroke="#B8B8BE" stroke-width="1.2"></rect><path d="M4 -5 V5" stroke="#D1D1D6" stroke-width="0.8"></path></g>
</g>
<g data-bind-display="{{g.aR.disp}}">
<path data-bind-d="{{g.aR.d}}" fill="none" stroke="#B8B8BE" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"></path>
<path data-bind-d="{{g.aR.d}}" fill="none" stroke="#E5E5EA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
<circle data-bind-cx="{{g.aR.sx}}" data-bind-cy="{{g.aR.sy}}" r="3.4" fill="#8E8E93"></circle>
<circle data-bind-cx="{{g.aR.ex}}" data-bind-cy="{{g.aR.ey}}" r="3.8" fill="#AEAEB2" stroke="#8E8E93" stroke-width="1"></circle>
<g data-bind-transform="{{g.aR.handT}}"><rect x="-2" y="-5" width="10" height="10" rx="3.5" data-bind-fill="{{body}}" stroke="#B8B8BE" stroke-width="1.2"></rect><path d="M4 -5 V5" stroke="#D1D1D6" stroke-width="0.8"></path></g>
</g>
<g data-bind-transform="{{g.toolT}}">
<g data-bind-display="{{v.tStop}}">
<path data-bind-d="{{g.pole}}" stroke="#8E8E93" stroke-width="3" stroke-linecap="round"></path>
<g data-bind-transform="{{g.signT}}">
<path data-bind-transform="{{g.w0}}" d="M0 0 L-8.42 -20.33 L8.42 -20.33 Z" fill="#FF453A" stroke="#E0352B" stroke-width="0.5" stroke-linejoin="round"></path>
<path data-bind-transform="{{g.w1}}" d="M0 0 L-8.42 -20.33 L8.42 -20.33 Z" fill="#FF453A" stroke="#E0352B" stroke-width="0.5" stroke-linejoin="round"></path>
<path data-bind-transform="{{g.w2}}" d="M0 0 L-8.42 -20.33 L8.42 -20.33 Z" fill="#FF453A" stroke="#E0352B" stroke-width="0.5" stroke-linejoin="round"></path>
<path data-bind-transform="{{g.w3}}" d="M0 0 L-8.42 -20.33 L8.42 -20.33 Z" fill="#FF453A" stroke="#E0352B" stroke-width="0.5" stroke-linejoin="round"></path>
<path data-bind-transform="{{g.w4}}" d="M0 0 L-8.42 -20.33 L8.42 -20.33 Z" fill="#FF453A" stroke="#E0352B" stroke-width="0.5" stroke-linejoin="round"></path>
<path data-bind-transform="{{g.w5}}" d="M0 0 L-8.42 -20.33 L8.42 -20.33 Z" fill="#FF453A" stroke="#E0352B" stroke-width="0.5" stroke-linejoin="round"></path>
<path data-bind-transform="{{g.w6}}" d="M0 0 L-8.42 -20.33 L8.42 -20.33 Z" fill="#FF453A" stroke="#E0352B" stroke-width="0.5" stroke-linejoin="round"></path>
<path data-bind-transform="{{g.w7}}" d="M0 0 L-8.42 -20.33 L8.42 -20.33 Z" fill="#FF453A" stroke="#E0352B" stroke-width="0.5" stroke-linejoin="round"></path>
<circle r="17.5" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="1.5" data-bind-opacity="{{g.barO}}"></circle>
<rect data-bind-transform="{{g.barT}}" x="-12" y="-3.5" width="24" height="7" rx="3.5" fill="#FFFFFF"></rect>
</g>
</g>
<g data-bind-display="{{v.tCan}}" data-bind-transform="{{g.canT}}">
<g data-bind-class="{{g.recoilC}}">
<path data-bind-transform="{{g.finT}}" d="M0 -7 L6 -13 L10 -7 Z M0 7 L6 13 L10 7 Z" fill="#D1D1D6"></path>
<rect data-bind-x="{{g.c3x}}" y="-5" width="10" height="10" rx="3" fill="#FFFFFF" stroke="#C7C7CC" stroke-width="1.2"></rect>
<rect data-bind-x="{{g.c3r}}" y="-5" width="2.5" height="10" fill="#FFD60A"></rect>
<rect data-bind-x="{{g.c2x}}" y="-6" width="12" height="12" rx="3.5" fill="#FFFFFF" stroke="#C7C7CC" stroke-width="1.2"></rect>
<rect data-bind-x="{{g.c2r}}" y="-6" width="2.5" height="12" fill="#FF375F"></rect>
<rect x="-4" y="-7" width="14" height="14" rx="4.5" fill="#FFFFFF" stroke="#C7C7CC" stroke-width="1.4"></rect>
<ellipse data-bind-cx="{{g.mx}}" cy="0" rx="1.8" ry="4.6" fill="#1D1D1F"></ellipse>
</g>
<circle data-bind-display="{{v.confFx}}" class="flash" data-bind-cx="{{g.mx2}}" cy="0" r="7" fill="#FFD60A"></circle>
</g>
<g data-bind-display="{{v.tThumb}}" data-bind-transform="{{g.toolS}}">
<rect x="-3" y="-16" width="5.5" height="12" rx="2.75" data-bind-fill="{{body}}" stroke="#B8B8BE" stroke-width="1.2"></rect>
<rect x="-6" y="-6" width="13" height="12" rx="4" data-bind-fill="{{body}}" stroke="#B8B8BE" stroke-width="1.2"></rect>
<path d="M-6 -1.5 H7 M-6 2 H7" stroke="#D1D1D6" stroke-width="0.8"></path>
</g>
<g data-bind-display="{{v.tWave}}" data-bind-transform="{{g.toolS}}">
<rect x="-5.5" y="-15" width="2.6" height="10" rx="1.3" data-bind-fill="{{body}}" stroke="#B8B8BE" stroke-width="1"></rect>
<rect x="-2.3" y="-17" width="2.6" height="12" rx="1.3" data-bind-fill="{{body}}" stroke="#B8B8BE" stroke-width="1"></rect>
<rect x="0.9" y="-16" width="2.6" height="11" rx="1.3" data-bind-fill="{{body}}" stroke="#B8B8BE" stroke-width="1"></rect>
<rect x="4.1" y="-13.5" width="2.6" height="9" rx="1.3" data-bind-fill="{{body}}" stroke="#B8B8BE" stroke-width="1"></rect>
<rect x="-6" y="-7" width="13" height="11" rx="4" data-bind-fill="{{body}}" stroke="#B8B8BE" stroke-width="1.2"></rect>
<rect transform="rotate(-40 -6 0)" x="-12" y="-2" width="7" height="2.8" rx="1.4" data-bind-fill="{{body}}" stroke="#B8B8BE" stroke-width="1"></rect>
</g>
<g data-bind-display="{{v.tUmb}}">
<path d="M0 0 V6 a3 3 0 0 1 -6 0" fill="none" stroke="#8E8E93" stroke-width="2.4" stroke-linecap="round"></path>
<path data-bind-d="{{g.umbD}}" stroke="#8E8E93" stroke-width="2.4" stroke-linecap="round"></path>
<g data-bind-transform="{{g.umbT}}">
<path d="M-60 0 A60 28 0 0 1 60 0 Q45 -6 30 0 Q15 -6 0 0 Q-15 -6 -30 0 Q-45 -6 -60 0 Z" fill="#0A84FF"></path>
<path d="M-60 0 Q-34 -24 0 -28 M60 0 Q34 -24 0 -28 M-30 0 Q-16 -22 0 -28 M30 0 Q16 -22 0 -28" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="1.2"></path>
<circle cx="0" cy="-29" r="2.2" fill="#8E8E93"></circle>
</g>
</g>
<g data-bind-display="{{v.tMag}}">
<path data-bind-d="{{g.magH}}" stroke="#8E8E93" stroke-width="4" stroke-linecap="round"></path>
<g data-bind-transform="{{g.magT}}">
<circle r="16" fill="#FFFFFF" fill-opacity="0.12" stroke="#C7C7CC" stroke-width="3.2"></circle>
<path d="M-9 -7 A11 11 0 0 1 -2 -11" fill="none" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="2" stroke-linecap="round"></path>
</g>
</g>
<g data-bind-display="{{v.tCof}}" data-bind-transform="{{g.cofT}}"><g class="sip"><g transform="translate(0 -18)">
<path class="wisp" d="M-4 -9 C -8 -14, 0 -18, -4 -26" fill="none" stroke="#AEAEB2" stroke-width="2" stroke-linecap="round"></path>
<path class="wisp w2" d="M1 -9 C -3 -14, 5 -18, 1 -26" fill="none" stroke="#AEAEB2" stroke-width="2" stroke-linecap="round"></path>
<path class="wisp w3" d="M6 -9 C 2 -14, 10 -18, 6 -26" fill="none" stroke="#AEAEB2" stroke-width="2" stroke-linecap="round"></path>
<ellipse cx="0" cy="14" rx="16" ry="3.5" fill="#FFFFFF" stroke="#D1D1D6" stroke-width="1.2"></ellipse>
<path data-bind-transform="{{g.handleT}}" d="M11 -2 Q18 -2 17 4 Q16 9 9.5 8" fill="none" stroke="#D1D1D6" stroke-width="3" stroke-linecap="round"></path>
<path d="M-11 -6 H11 L9.5 8 Q8.5 13 4 13 H-4 Q-8.5 13 -9.5 8 Z" fill="#FFFFFF" stroke="#D1D1D6" stroke-width="1.5" stroke-linejoin="round"></path>
<ellipse cx="0" cy="-6" rx="11" ry="2.6" fill="#7A5236"></ellipse>
</g></g></g>
</g>
<g data-bind-transform="{{g.confT}}" data-bind-display="{{v.confFx}}">
<rect class="cf c0" x="-3.0" y="-1.25" width="6" height="2.5" rx="1" fill="#FF375F"></rect>
<rect class="cf c1" x="-2.5" y="-1.5" width="5" height="3" rx="1" fill="#FFD60A"></rect>
<rect class="cf c2" x="-2.5" y="-1.5" width="5" height="3" rx="1" fill="#30D158"></rect>
<rect class="cf c3" x="-2.0" y="-2.0" width="4" height="4" rx="1" fill="#64D2FF"></rect>
<rect class="cf c4" x="-3.0" y="-1.25" width="6" height="2.5" rx="1" fill="#BF5AF2"></rect>
<rect class="cf c5" x="-3.0" y="-1.25" width="6" height="2.5" rx="1" fill="#FF9F0A"></rect>
<rect class="cf c6" x="-2.5" y="-1.5" width="5" height="3" rx="1" fill="#FF375F"></rect>
<rect class="cf c7" x="-3.0" y="-1.25" width="6" height="2.5" rx="1" fill="#FFD60A"></rect>
<rect class="cf c8" x="-2.0" y="-2.0" width="4" height="4" rx="1" fill="#30D158"></rect>
<rect class="cf c9" x="-2.0" y="-2.0" width="4" height="4" rx="1" fill="#64D2FF"></rect>
<rect class="cf c10" x="-2.0" y="-2.0" width="4" height="4" rx="1" fill="#BF5AF2"></rect>
<rect class="cf c11" x="-3.0" y="-1.25" width="6" height="2.5" rx="1" fill="#FF9F0A"></rect>
<rect class="cf c12" x="-2.0" y="-2.0" width="4" height="4" rx="1" fill="#FF375F"></rect>
<rect class="cf c13" x="-2.0" y="-2.0" width="4" height="4" rx="1" fill="#FFD60A"></rect>
<rect class="cf c14" x="-2.5" y="-1.5" width="5" height="3" rx="1" fill="#30D158"></rect>
<rect class="cf c15" x="-2.0" y="-2.0" width="4" height="4" rx="1" fill="#64D2FF"></rect>
<rect class="cf c16" x="-2.0" y="-2.0" width="4" height="4" rx="1" fill="#BF5AF2"></rect>
<rect class="cf c17" x="-3.0" y="-1.25" width="6" height="2.5" rx="1" fill="#FF9F0A"></rect>
<rect class="cf c18" x="-3.0" y="-1.25" width="6" height="2.5" rx="1" fill="#FF375F"></rect>
<rect class="cf c19" x="-2.5" y="-1.5" width="5" height="3" rx="1" fill="#FFD60A"></rect>
<rect class="cf c20" x="-2.0" y="-2.0" width="4" height="4" rx="1" fill="#30D158"></rect>
<rect class="cf c21" x="-2.5" y="-1.5" width="5" height="3" rx="1" fill="#64D2FF"></rect>
<rect class="cf c22" x="-2.0" y="-2.0" width="4" height="4" rx="1" fill="#BF5AF2"></rect>
<rect class="cf c23" x="-2.5" y="-1.5" width="5" height="3" rx="1" fill="#FF9F0A"></rect>
<rect class="cf c24" x="-2.5" y="-1.5" width="5" height="3" rx="1" fill="#FF375F"></rect>
<rect class="cf c25" x="-3.0" y="-1.25" width="6" height="2.5" rx="1" fill="#FFD60A"></rect>
<rect class="cf c26" x="-2.5" y="-1.5" width="5" height="3" rx="1" fill="#30D158"></rect>
<rect class="cf c27" x="-2.5" y="-1.5" width="5" height="3" rx="1" fill="#64D2FF"></rect>
<rect class="cf c28" x="-2.0" y="-2.0" width="4" height="4" rx="1" fill="#BF5AF2"></rect>
<rect class="cf c29" x="-3.0" y="-1.25" width="6" height="2.5" rx="1" fill="#FF9F0A"></rect>
<rect class="cf c30" x="-2.5" y="-1.5" width="5" height="3" rx="1" fill="#FF375F"></rect>
<rect class="cf c31" x="-2.0" y="-2.0" width="4" height="4" rx="1" fill="#FFD60A"></rect>
<rect class="cf c32" x="-2.5" y="-1.5" width="5" height="3" rx="1" fill="#30D158"></rect>
<rect class="cf c33" x="-2.5" y="-1.5" width="5" height="3" rx="1" fill="#64D2FF"></rect>
<rect class="cf c34" x="-3.0" y="-1.25" width="6" height="2.5" rx="1" fill="#BF5AF2"></rect>
<rect class="cf c35" x="-2.5" y="-1.5" width="5" height="3" rx="1" fill="#FF9F0A"></rect>
<rect class="cf c36" x="-2.5" y="-1.5" width="5" height="3" rx="1" fill="#FF375F"></rect>
<rect class="cf c37" x="-2.0" y="-2.0" width="4" height="4" rx="1" fill="#FFD60A"></rect>
<rect class="cf c38" x="-3.0" y="-1.25" width="6" height="2.5" rx="1" fill="#30D158"></rect>
<rect class="cf c39" x="-3.0" y="-1.25" width="6" height="2.5" rx="1" fill="#64D2FF"></rect>
</g>
<circle data-bind-cx="{{g.rpx}}" data-bind-cy="{{g.rpy}}" data-bind-r="{{g.rpr}}" fill="none" data-bind-stroke="{{glow}}" stroke-width="1.5" data-bind-opacity="{{g.rpo}}"></circle>
</g>
<g data-bind-display="{{v.hud}}">
<g class="hud2"><g transform="translate(200 0) scale(-1 1)">
<path data-bind-d="{{hud.pL}}" fill="#0A4FB8" fill-opacity="0.74" stroke="#64D2FF" stroke-opacity="0.9" stroke-width="0.8"></path>
<path data-bind-d="{{hud.pC}}" fill="#0A4FB8" fill-opacity="0.74" stroke="#64D2FF" stroke-opacity="0.9" stroke-width="0.8"></path>
<path data-bind-d="{{hud.pR}}" fill="#0A4FB8" fill-opacity="0.74" stroke="#64D2FF" stroke-opacity="0.9" stroke-width="0.8"></path>
<path data-bind-d="{{hud.top}}" fill="none" stroke="#9BE3FF" stroke-width="1.6" stroke-linecap="round" filter="url(#mg)"></path>
<path data-bind-d="{{hud.bot}}" fill="none" stroke="#9BE3FF" stroke-opacity="0.6" stroke-width="1" stroke-linecap="round"></path>
<g clip-path="url(#bandclip)"><rect class="sweep" x="-40" y="90" width="12" height="120" fill="#9BE3FF" fill-opacity="0.25"></rect></g>
<g data-bind-transform="{{act.iconT}}"><path data-bind-d="{{act.icon}}" fill="none" stroke="#BFE3FF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"></path></g>
<text x="59" y="124.5" font-size="6.5" font-weight="700" letter-spacing="1.2" fill="#BFE3FF" font-family="Inter, system-ui, sans-serif">{{act.title}}</text>
<text class="blink" x="150" y="124.5" text-anchor="end" font-size="5.6" font-weight="600" fill="#9BE3FF" font-family="Inter, system-ui, sans-serif">{{act.status}}</text>
<path d="M46 128.5 H154" stroke="#64D2FF" stroke-opacity="0.45" stroke-width="0.6"></path>
<g clip-path="url(#screenclip)">
<g data-bind-display="{{v.scr_search}}">
<rect x="52" y="132" width="96" height="12" rx="6" fill="#FFFFFF" fill-opacity="0.95"></rect>
<circle cx="58.5" cy="137.6" r="2.4" fill="none" stroke="#0A4FB8" stroke-width="1"></circle><path d="M60.3 139.4 L62 141.1" stroke="#0A4FB8" stroke-width="1" stroke-linecap="round"></path>
<g clip-path="url(#clipQ)"><text x="64" y="140.4" font-size="6.2" font-weight="500" fill="#0A2A5E" font-family="Inter, system-ui, sans-serif">{{act.q}}</text></g>
<g class="caretQ"><rect class="blink" data-bind-x="{{act.caretX}}" y="134.5" width="0.8" height="7" fill="#0A4FB8"></rect></g>
<rect class="hlS" x="49" y="147.5" width="102" height="13.5" rx="3" fill="#64D2FF" fill-opacity="0.18" stroke="#64D2FF" stroke-opacity="0.7" stroke-width="0.6"></rect>
<g class="sr0"><text x="52" y="153" font-size="4.6" fill="#9BE3FF" font-family="Inter, system-ui, sans-serif">{{act.u0}}</text><text x="52" y="159.5" font-size="6.2" font-weight="700" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">{{act.t0}}</text><rect x="52" y="161.8" width="86" height="1.6" rx="0.8" fill="#FFFFFF" fill-opacity="0.35"></rect></g>
<g class="sr1"><text x="52" y="167" font-size="4.6" fill="#9BE3FF" font-family="Inter, system-ui, sans-serif">{{act.u1}}</text><text x="52" y="173.5" font-size="6.2" font-weight="700" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">{{act.t1}}</text><rect x="52" y="175.8" width="72" height="1.6" rx="0.8" fill="#FFFFFF" fill-opacity="0.35"></rect></g>
<g class="sr2"><text x="52" y="181" font-size="4.6" fill="#9BE3FF" font-family="Inter, system-ui, sans-serif">{{act.u2}}</text><text x="52" y="187.5" font-size="6.2" font-weight="700" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">{{act.t2}}</text><rect x="52" y="189.8" width="80" height="1.6" rx="0.8" fill="#FFFFFF" fill-opacity="0.35"></rect></g>
</g>
<g data-bind-display="{{v.scr_tasks}}">
<g class="scrollT">
<rect class="hlT" x="49" y="131.5" width="102" height="10" rx="2.5" fill="#64D2FF" fill-opacity="0.18" stroke="#64D2FF" stroke-opacity="0.6" stroke-width="0.6"></rect>
<rect x="52" y="134" width="6" height="6" rx="1.8" fill="none" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="0.8"></rect>
<text x="62" y="139" font-size="6" font-weight="500" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Rechnung bezahlen</text>
<path class="ck0T" d="M53.3 137 L54.8 138.6 L57 135.4" fill="none" stroke="#7CFFCB" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path>
<rect class="st0T" x="61" y="136.6" width="56" height="0.8" fill="#FFFFFF" fill-opacity="0.8"></rect>
<rect x="52" y="145" width="6" height="6" rx="1.8" fill="none" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="0.8"></rect>
<text x="62" y="150" font-size="6" font-weight="500" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Backup prüfen</text>
<path class="ck1T" d="M53.3 148 L54.8 149.6 L57 146.4" fill="none" stroke="#7CFFCB" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path>
<rect class="st1T" x="61" y="147.6" width="43" height="0.8" fill="#FFFFFF" fill-opacity="0.8"></rect>
<rect x="52" y="156" width="6" height="6" rx="1.8" fill="none" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="0.8"></rect>
<text x="62" y="161" font-size="6" font-weight="500" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Mails beantworten</text>
<path class="ck2T" d="M53.3 159 L54.8 160.6 L57 157.4" fill="none" stroke="#7CFFCB" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path>
<rect class="st2T" x="61" y="158.6" width="56" height="0.8" fill="#FFFFFF" fill-opacity="0.8"></rect>
<rect x="52" y="167" width="6" height="6" rx="1.8" fill="none" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="0.8"></rect>
<text x="62" y="172" font-size="6" font-weight="500" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Einkaufsliste</text>
<rect x="52" y="178" width="6" height="6" rx="1.8" fill="none" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="0.8"></rect>
<text x="62" y="183" font-size="6" font-weight="500" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Sport um 18:30</text>
<rect x="52" y="189" width="6" height="6" rx="1.8" fill="none" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="0.8"></rect>
<text x="62" y="194" font-size="6" font-weight="500" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Steuer-Unterlagen</text>
<rect x="52" y="200" width="6" height="6" rx="1.8" fill="none" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="0.8"></rect>
<text x="62" y="205" font-size="6" font-weight="500" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Zahnarzt anrufen</text>
</g>
</g>
<g data-bind-display="{{v.scr_mail}}">
<rect class="hlM" x="49" y="131" width="102" height="14" rx="3" fill="#64D2FF" fill-opacity="0.18" stroke="#64D2FF" stroke-opacity="0.6" stroke-width="0.6"></rect>
<circle class="dt0" cx="53" cy="135.2" r="1.6" fill="#64D2FF"></circle>
<text x="57" y="137" font-size="6" font-weight="700" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Stadtwerke</text>
<text x="148" y="137" text-anchor="end" font-size="4.8" fill="#BFE3FF" font-family="Inter, system-ui, sans-serif">08:12</text>
<text x="57" y="143.3" font-size="5.2" fill="#D6ECFF" font-family="Inter, system-ui, sans-serif">Ihre Stromrechnung</text>
<circle class="dt1" cx="53" cy="150.2" r="1.6" fill="#64D2FF"></circle>
<text x="57" y="152" font-size="6" font-weight="700" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Paketdienst</text>
<text x="148" y="152" text-anchor="end" font-size="4.8" fill="#BFE3FF" font-family="Inter, system-ui, sans-serif">07:45</text>
<text x="57" y="158.3" font-size="5.2" fill="#D6ECFF" font-family="Inter, system-ui, sans-serif">Paket kommt heute</text>
<circle class="dt2" cx="53" cy="165.2" r="1.6" fill="#64D2FF"></circle>
<text x="57" y="167" font-size="6" font-weight="700" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Team</text>
<text x="148" y="167" text-anchor="end" font-size="4.8" fill="#BFE3FF" font-family="Inter, system-ui, sans-serif">07:30</text>
<text x="57" y="173.3" font-size="5.2" fill="#D6ECFF" font-family="Inter, system-ui, sans-serif">Meeting verschoben</text>
<circle class="dt3" cx="53" cy="180.2" r="1.6" fill="#64D2FF"></circle>
<text x="57" y="182" font-size="6" font-weight="700" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Newsletter</text>
<text x="148" y="182" text-anchor="end" font-size="4.8" fill="#BFE3FF" font-family="Inter, system-ui, sans-serif">Gestern</text>
<text x="57" y="188.3" font-size="5.2" fill="#D6ECFF" font-family="Inter, system-ui, sans-serif">Neuigkeiten der Woche</text>
<g class="tagM"><rect x="120" y="149" width="28" height="7.5" rx="3.75" fill="#FF9F0A"></rect><text x="134" y="154.3" text-anchor="middle" font-size="4.6" font-weight="700" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Wichtig</text></g>
</g>
<g data-bind-display="{{v.scr_cal}}">
<text x="61" y="137" text-anchor="middle" font-size="5" font-weight="700" fill="#BFE3FF" font-family="Inter, system-ui, sans-serif">Mo</text>
<rect x="52" y="140" width="18.6" height="54" rx="2" fill="#FFFFFF" fill-opacity="0.07"></rect>
<text x="80.6" y="137" text-anchor="middle" font-size="5" font-weight="700" fill="#BFE3FF" font-family="Inter, system-ui, sans-serif">Di</text>
<rect x="71.6" y="140" width="18.6" height="54" rx="2" fill="#FFFFFF" fill-opacity="0.07"></rect>
<text x="100.2" y="137" text-anchor="middle" font-size="5" font-weight="700" fill="#BFE3FF" font-family="Inter, system-ui, sans-serif">Mi</text>
<rect x="91.2" y="140" width="18.6" height="54" rx="2" fill="#FFFFFF" fill-opacity="0.07"></rect>
<text x="119.8" y="137" text-anchor="middle" font-size="5" font-weight="700" fill="#BFE3FF" font-family="Inter, system-ui, sans-serif">Do</text>
<rect x="110.8" y="140" width="18.6" height="54" rx="2" fill="#FFFFFF" fill-opacity="0.07"></rect>
<text x="139.4" y="137" text-anchor="middle" font-size="5" font-weight="700" fill="#BFE3FF" font-family="Inter, system-ui, sans-serif">Fr</text>
<rect x="130.4" y="140" width="18.6" height="54" rx="2" fill="#FFFFFF" fill-opacity="0.07"></rect>
<path d="M52 153 H150" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="0.5"></path>
<path d="M52 166 H150" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="0.5"></path>
<path d="M52 179 H150" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="0.5"></path>
<g class="ev0"><rect x="52.5" y="142" width="17.6" height="9" rx="2" fill="#64D2FF" fill-opacity="0.9"></rect><text x="54" y="147.2" font-size="4.3" font-weight="700" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Standup</text></g>
<g class="ev1"><rect x="72.1" y="166" width="17.6" height="12" rx="2" fill="#FF9F0A" fill-opacity="0.9"></rect><text x="73.6" y="171.2" font-size="4.3" font-weight="700" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Arzt</text></g>
<g class="ev2"><rect x="91.7" y="150" width="17.6" height="14" rx="2" fill="#BF5AF2" fill-opacity="0.9"></rect><text x="93.2" y="155.2" font-size="4.3" font-weight="700" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Projekt</text></g>
<g class="ev3"><rect x="111.3" y="176" width="17.6" height="10" rx="2" fill="#30D158" fill-opacity="0.9"></rect><text x="112.8" y="181.2" font-size="4.3" font-weight="700" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Sport</text></g>
<g class="ev4"><rect x="130.9" y="144" width="17.6" height="10" rx="2" fill="#64D2FF" fill-opacity="0.9"></rect><text x="132.4" y="149.2" font-size="4.3" font-weight="700" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Review</text></g>
<rect class="clashR" x="90.7" y="151" width="19.6" height="16" rx="2.5" fill="none" stroke="#FF453A" stroke-width="1.2"></rect>
<g class="clash"><rect x="91.7" y="157" width="17.6" height="9" rx="2" fill="#FF9F0A" fill-opacity="0.95"></rect><text x="93.7" y="162.4" font-size="4.3" font-weight="700" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Call</text></g>
<g class="nowL"><path d="M50 143 H152" stroke="#FF453A" stroke-width="0.8"></path><circle cx="50" cy="143" r="1.4" fill="#FF453A"></circle></g>
</g>
<g data-bind-display="{{v.scr_run}}">
<rect x="48" y="131" width="104" height="64" rx="4" fill="#04122B" fill-opacity="0.85"></rect>
<circle cx="53" cy="135" r="1.3" fill="#FF5F57"></circle><circle cx="57" cy="135" r="1.3" fill="#FEBC2E"></circle><circle cx="61" cy="135" r="1.3" fill="#28C840"></circle>
<g clip-path="url(#clipL0)"><text x="52" y="145" font-size="5.4" fill="#FFFFFF" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">$ ssh server</text></g>
<g clip-path="url(#clipL1)"><text x="52" y="153" font-size="5.4" fill="#FFFFFF" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">$ rsync -av ~/daten backup/</text></g>
<text class="tl2" x="52" y="161" font-size="5.4" fill="#9BE3FF" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">sende Dateiliste …</text>
<g class="tl3"><rect x="52" y="166" width="70" height="4" rx="1" fill="#64D2FF" fill-opacity="0.2"></rect><rect class="tlbar" x="52" y="166" width="70" height="4" rx="1" fill="#64D2FF"></rect><text x="126" y="169.6" font-size="5" fill="#9BE3FF" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">{{act.rv}}</text></g>
<text class="tl4" x="52" y="180" font-size="5.4" fill="#7CFFCB" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">✓ db.sql  ✓ config/</text>
<rect class="blink" x="52" y="185" width="3.2" height="5.5" fill="#FFFFFF"></rect>
</g>
</g>
<g transform="translate(-15 0) skewY(10)">
<text x="2" y="118" font-size="6" font-weight="700" letter-spacing="1.2" fill="#BFE3FF" font-family="Inter, system-ui, sans-serif">WETTER</text>
<circle class="halo" cx="12" cy="129" r="5" fill="#FFD60A"></circle>
<path class="drift" d="M8 141 H26 A4.5 4.5 0 0 0 25 132.2 A6.5 6.5 0 0 0 12.6 133.6 A4 4 0 0 0 8 141 Z" fill="#FFFFFF"></path>
<text x="31" y="142" font-size="15" font-weight="700" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">7°</text>
<text x="2" y="154" font-size="6.6" font-weight="600" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">Bewölkt</text>
<text x="2" y="163" font-size="5.6" fill="#BFE3FF" font-family="Inter, system-ui, sans-serif">H 9°  ·  T 2°</text>
<rect x="2" y="168" width="44" height="2.5" rx="1.25" fill="#64D2FF" fill-opacity="0.25"></rect>
<rect x="2" y="168" width="14" height="2.5" rx="1.25" fill="#64D2FF"></rect>
<text x="2" y="178" font-size="5.2" fill="#BFE3FF" font-family="Inter, system-ui, sans-serif">Regen 30 %</text>
</g>
<g transform="translate(160 0) skewY(-10)">
<text x="4" y="121" font-size="6" font-weight="700" letter-spacing="1.2" fill="#BFE3FF" font-family="Inter, system-ui, sans-serif">JETZT</text>
<text x="4" y="140" font-size="15" font-weight="700" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">{{clock}}</text>
<text x="4" y="150" font-size="6" fill="#D6ECFF" font-family="Inter, system-ui, sans-serif">{{dateStr}}</text>
<path d="M4 155 H52" stroke="#64D2FF" stroke-opacity="0.4" stroke-width="0.6"></path>
<text x="4" y="164" font-size="5.4" fill="#BFE3FF" font-family="Inter, system-ui, sans-serif">Nächster Termin</text>
<text x="4" y="173" font-size="6.6" font-weight="700" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif">14:00 Arzt</text>
</g>

</g>
</g>
</g>
</svg>`;

class DCLogic {
  constructor() { this.state = {}; this.props = {}; }
  setState(o) { this.state = Object.assign({}, this.state, o); if (this._host) this._host._schedule(); }
  forceUpdate() { if (this._host) this._host._schedule(); }
}

// ---- Logik (identisch zum Design-Board) ----
var CFG = { ex1: 80, ex2: 120, ey: 96, rx: 10, ry: 15, look: 0.9, aw: 11, ah: 8, bg: 20, bw: 8, my: 126, mw: 8 };
var SHAPES = {
  squircle: { label: 'Squircle', b: [24, 22, 152, 152, 60, 60, 60, 60, 60, 60, 60, 60], p: [40, 52, 120, 92, 40], stand: 0 },
  kapsel: { label: 'Kapsel', b: [12, 44, 176, 116, 58, 58, 58, 58, 58, 58, 58, 58], p: [30, 56, 140, 90, 42], stand: 0 },
  kiesel: { label: 'Kiesel', b: [22, 18, 156, 164, 78, 78, 78, 78, 90, 90, 74, 74], p: [40, 56, 120, 90, 42], stand: 0 },
  helm: { label: 'Helm', b: [28, 20, 144, 156, 72, 72, 26, 26, 64, 64, 26, 26], p: [42, 56, 116, 90, 36], stand: 0 },
  monitor: { label: 'Monitor', b: [24, 22, 152, 132, 40, 40, 40, 40, 40, 40, 40, 40], p: [36, 36, 128, 104, 30], stand: 1 }
};
var ORDER = ['squircle', 'kapsel', 'kiesel', 'helm', 'monitor'];
var AUTO = ['squircle', 'kapsel', 'kiesel', 'helm'];
var MOODS = [
  {id: 'neutral', label: 'Neutral', L: {}, R: {}, m: 'smile', t: {}},
  {id: 'happy', label: 'Freude', L: {s: 'arc'}, R: {s: 'arc'}, m: 'big', t: {ty: -6, s: 1.04}},
  {id: 'think', label: 'Nachdenken', L: {dx: 5, dy: -6, sy: 0.9}, R: {dx: 5, dy: -6, sy: 0.9}, m: 'side', b: 'raise', t: {r: -6}},
  {id: 'wow', label: 'Überrascht', L: {sc: 1.18}, R: {sc: 1.18}, m: 'o', b: 'up', t: {ty: -8, s: 1.06}},
  {id: 'focus', label: 'Arbeitet', L: {sy: 0.42, dy: 3}, R: {sy: 0.42, dy: 3}, m: 'flat', t: {ty: 2, s: 0.97}},
  {id: 'oops', label: 'Oops', L: {dy: 4, sy: 0.85}, R: {dy: 4, sy: 0.85}, m: 'wave', b: 'sad', t: {r: 5, ty: 3, s: 0.96}},
  {id: 'wink', label: 'Zwinkern', L: {}, R: {s: 'arc'}, m: 'smirk', t: {r: 4, ty: -2}},
  {id: 'sleep', label: 'Schlafen', L: {s: 'closed'}, R: {s: 'closed'}, m: 'flat', t: {ty: 4, s: 0.95}, sym: 'zzz'},
  {id: 'question', label: 'Frage', L: {dx: -4, dy: -5, sy: 0.9}, R: {dx: -4, dy: -5, sy: 0.9}, m: 'side', b: 'raise', t: {r: -5}, sym: '?'},
  {id: 'alert', label: 'Achtung', L: {sc: 1.2}, R: {sc: 1.2}, m: 'o', b: 'up', t: {ty: -6, s: 1.05}, sym: '!'},
  {id: 'meh', label: 'Nicht gut', L: {sy: 0.55, dy: 2}, R: {sy: 0.55, dy: 2}, m: 'frown', b: 'angry', t: {r: 3}, sym: '!?'},
  {id: 'confused', label: 'Verwirrt', L: {sc: 0.85}, R: {sc: 1.15, dy: -2}, m: 'wave', b: 'raise', t: {r: -5}, sym: '??'}
];
var READ = {L: {dy: 5, sy: 0.85}, R: {dy: 5, sy: 0.85}, m: 'flat', t: {ty: -2}};
var REACTS = {
  stop: {L: {sy: 0.55, dy: 1}, R: {sy: 0.55, dy: 1}, m: 'frown', b: 'angry', t: {r: -3}},
  idea: {L: {sc: 1.12, dy: -4}, R: {sc: 1.12, dy: -4}, m: 'smile', b: 'up', t: {ty: -6, s: 1.04}},
  heart: {L: {s: 'arc'}, R: {s: 'arc'}, m: 'big', t: {ty: -4}},
  timer: {L: {}, R: {}, m: 'flat', t: {r: 2}},
  confetti: {L: {s: 'arc'}, R: {s: 'arc'}, m: 'big', t: {ty: -10, s: 1.07}},
  coffee: {L: {s: 'arc'}, R: {s: 'arc'}, m: 'smile', t: {ty: 2, r: 2}},
  thumb: {L: {s: 'arc'}, R: {s: 'arc'}, m: 'big', t: {ty: -3}},
  wave: {L: {}, R: {s: 'arc'}, m: 'big', t: {r: -3}},
  umbrella: {L: {dy: -5}, R: {dy: -5}, m: 'smile', t: {}},
  magnifier: {L: {sy: 0.55}, R: {sc: 1.5}, m: 'flat', b: 'raise', t: {r: -3}},
  music: {L: {s: 'closed'}, R: {s: 'closed'}, m: 'smile', t: {}},
  battery: {L: {s: 'closed'}, R: {s: 'closed'}, m: 'flat', t: {ty: 5, r: 4, s: 0.95}}
};
var ACTS = {
  search: {title: 'RECHERCHE', status: 'sucht …', icon: 'M11 5 A6 6 0 1 1 10.99 5 Z M15.5 15.5 L20 20', lh: 'QUELLEN', l: ['Wikipedia', 'heise online', 'MS Learn'], rl: 'FORTSCHRITT', rv: '68 %', bars: [4, 7, 5, 9, 6, 10]},
  cal: {title: 'KALENDER', status: 'plant …', icon: 'M4 6 H20 V20 H4 Z M4 10 H20 M9 3 V7 M15 3 V7', lh: 'HEUTE', l: ['09:30 Standup', '14:00 Arzt', '18:30 Sport'], rl: 'KONFLIKTE', rv: '1', bars: [5, 6, 8, 7, 4, 3]},
  tasks: {title: 'AUFGABEN', status: 'hakt ab …', icon: 'M10 6 H20 M10 12 H20 M10 18 H20 M4 6 L5.5 7.5 L8 5 M4 12 L5.5 13.5 L8 11 M4 18 L5.5 19.5 L8 17', lh: 'ERLEDIGT', l: ['Rechnung', 'Backup', 'Mails'], rl: 'OFFEN', rv: '4', bars: [3, 5, 4, 7, 6, 9]},
  mail: {title: 'POSTEINGANG', status: 'liest …', icon: 'M3 6 H21 V19 H3 Z M3 7 L12 13 L21 7', lh: 'ABSENDER', l: ['Stadtwerke', 'Paketdienst', 'Team'], rl: 'UNGELESEN', rv: '12', bars: [2, 4, 3, 8, 5, 6]},
  run: {title: 'TERMINAL', status: 'tippt …', icon: 'M3 5 H21 V19 H3 Z M7 10 L10 12.5 L7 15 M12 15 H16', lh: 'SCHRITTE', l: ['Verbinden', 'Synchron.', 'Prüfen'], rl: 'FORTSCHRITT', rv: '68 %', bars: [6, 8, 7, 9, 10, 8]}
};
var K = 0.5523;
function nr(v) { return Math.round(v * 100) / 100; }
function P() { var a = []; for (var i = 0; i < arguments.length; i++) { var x = arguments[i]; a.push(typeof x === 'number' ? nr(x) : x); } return a.join(' '); }
function ell(cx, cy, rx, ry) { return P('M', cx - rx, cy, 'a', rx, ry, 0, 1, 0, 2 * rx, 0, 'a', rx, ry, 0, 1, 0, -2 * rx, 0, 'Z'); }
var HR = 124, HYT = 98, HYB = 184, HE = 16;
function harc(a, b, Y) {
  var n = Math.max(2, Math.round(Math.abs(b - a) / 3)), out = [];
  for (var i = 0; i <= n; i++) { var t = (a + (b - a) * i / n) * Math.PI / 180; out.push((i ? 'L ' : 'M ') + nr(100 + HR * Math.sin(t)) + ' ' + nr(Y + HE * Math.cos(t))); }
  return out.join(' ');
}
function hpanel(a, b) { return harc(a, b, HYT) + ' ' + harc(b, a, HYB).replace(/^M/, 'L') + ' Z'; }
var HUD = { band: hpanel(-78, 78), pL: hpanel(-78, -30), pC: hpanel(-27, 27), pR: hpanel(30, 78), top: harc(-78, 78, HYT), bot: harc(-78, 78, HYB) };
function shapePath(b) {
  var x = b[0], y = b[1], w = b[2], h = b[3];
  var a = b[4], c = b[5], d = b[6], e = b[7], A = b[8], C = b[9], D = b[10], E = b[11];
  return P('M', x + a, y, 'L', x + w - c, y,
    'C', x + w - c + K * c, y, x + w, y + C - K * C, x + w, y + C,
    'L', x + w, y + h - D,
    'C', x + w, y + h - D + K * D, x + w - d + K * d, y + h, x + w - d, y + h,
    'L', x + e, y + h,
    'C', x + e - K * e, y + h, x, y + h - E + K * E, x, y + h - E,
    'L', x, y + A,
    'C', x, y + A - K * A, x + a - K * a, y, x + a, y, 'Z');
}
function face(C, md, pivot) {
  var o = {pu: '', ln: '', brow: '', mf: '', m: ''};
  [[C.ex1, md.L], [C.ex2, md.R]].forEach(function (p) {
    var cx = p[0], e = p[1], cy = C.ey, s = e.s || 'open';
    var k = e.sc || 1, sy = e.sy || 1, look = C.look || 1;
    if (s === 'open') {
      o.pu += ell(cx + (e.dx || 0) * look, cy + (e.dy || 0) * look, C.rx * k, C.ry * k * sy) + ' ';
    } else if (s === 'arc') {
      o.ln += P('M', cx - C.aw, cy + C.ah * 0.4, 'Q', cx, cy - C.ah, cx + C.aw, cy + C.ah * 0.4) + ' ';
    } else {
      o.ln += P('M', cx - C.aw, cy, 'Q', cx, cy + C.ah * 0.7, cx + C.aw, cy) + ' ';
    }
  });
  var a = C.ex1, b = C.ex2, by = C.ey - C.bg, bw = C.bw;
  if (md.b === 'raise') o.brow = P('M', a - bw, by + 1, 'Q', a, by - 2, a + bw, by + 1, 'M', b - bw, by - 5, 'Q', b, by - 12, b + bw, by - 5);
  if (md.b === 'up') o.brow = P('M', a - bw, by - 4, 'Q', a, by - 11, a + bw, by - 4, 'M', b - bw, by - 4, 'Q', b, by - 11, b + bw, by - 4);
  if (md.b === 'sad') o.brow = P('M', a - bw, by + 2, 'L', a + bw, by - 4, 'M', b - bw, by - 4, 'L', b + bw, by + 2);
  if (md.b === 'angry') o.brow = P('M', a - bw, by - 3, 'L', a + bw, by + 3, 'M', b - bw, by + 3, 'L', b + bw, by - 3);
  var x = 100, y = C.my, w = C.mw;
  if (md.m === 'smile') o.m = P('M', x - w, y, 'Q', x, y + w * 0.6, x + w, y);
  if (md.m === 'big') { o.mf = P('M', x - w * 1.2, y - 2, 'L', x + w * 1.2, y - 2, 'Q', x + w * 1.2, y + w * 1.3, x, y + w * 1.3, 'Q', x - w * 1.2, y + w * 1.3, x - w * 1.2, y - 2, 'Z'); o.m = o.mf; }
  if (md.m === 'side') o.m = P('M', x - w * 0.5, y + 3, 'Q', x + w * 0.2, y + 5, x + w * 0.8, y - 2);
  if (md.m === 'o') { o.mf = ell(x, y + 3, w * 0.34, w * 0.44); o.m = o.mf; }
  if (md.m === 'flat') o.m = P('M', x - w * 0.5, y + 3, 'L', x + w * 0.5, y + 3);
  if (md.m === 'frown') o.m = P('M', x - w * 0.7, y + 6, 'Q', x, y - 1, x + w * 0.7, y + 6);
  if (md.m === 'wave') o.m = P('M', x - w * 0.8, y + 4, 'Q', x - w * 0.4, y - 1, x, y + 4, 'Q', x + w * 0.4, y + 9, x + w * 0.8, y + 4);
  if (md.m === 'smirk') o.m = P('M', x - w * 0.7, y + 1, 'Q', x + w * 0.1, y + w * 0.55, x + w * 0.9, y - 4);
  var t = md.t || {}, ts = t.s || 1, pv = pivot || 176;
  o.tf = 'translate(0 ' + nr(t.ty || 0) + ') rotate(' + nr(t.r || 0) + ' 100 ' + nr(pv) + ') translate(100 ' + nr(pv) + ') scale(' + nr(2 - ts) + ' ' + nr(ts) + ') translate(-100 ' + nr(-pv) + ')';
  return o;
}
function edgeX(b, y) {
  var x0 = b[0], top = b[1], w = b[2], h = b[3];
  var rxT = b[5], ryT = b[9], rxB = b[6], ryB = b[10], d;
  if (y < top + ryT) { d = Math.min(1, (top + ryT - y) / ryT); return x0 + w - rxT * (1 - Math.sqrt(1 - d * d)); }
  if (y > top + h - ryB) { d = Math.min(1, (y - (top + h - ryB)) / ryB); return x0 + w - rxB * (1 - Math.sqrt(1 - d * d)); }
  return x0 + w;
}
function clamp(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
function eob(k) { var c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
function ik(S, T, L1, L2, sgn) {
  var dx = T.x - S.x, dy = T.y - S.y, d = Math.sqrt(dx * dx + dy * dy) || 0.001;
  var dm = Math.max(Math.abs(L1 - L2) + 0.01, Math.min(d, L1 + L2 - 0.01));
  var base = Math.atan2(dy, dx);
  var c = (L1 * L1 + dm * dm - L2 * L2) / (2 * L1 * dm);
  var a = Math.acos(Math.max(-1, Math.min(1, c)));
  var ang = base + sgn * a;
  var E = { x: S.x + L1 * Math.cos(ang), y: S.y + L1 * Math.sin(ang) };
  var Tt = { x: S.x + dm * Math.cos(base), y: S.y + dm * Math.sin(base) };
  return { e: E, t: Tt, deg: Math.atan2(Tt.y - E.y, Tt.x - E.x) * 180 / Math.PI };
}
function quad(A, C, B, t) { var u = 1 - t; return { x: u * u * A.x + 2 * u * t * C.x + t * t * B.x, y: u * u * A.y + 2 * u * t * C.y + t * t * B.y }; }
function hatchG(x, y, dir, e) {
  var hk = clamp(e / 0.22), out = 1.6 * clamp(hk / 0.3), flip = clamp((hk - 0.3) / 0.7);
  var o = clamp(hk * 3);
  return { t: 'translate(' + nr(x) + ' ' + nr(y) + ')', slotO: nr(o), rimO: nr(o * 0.8),
    doorT: 'translate(' + nr(dir * out * (1 - flip)) + ' 12) scale(1 ' + nr(1 - flip) + ') translate(0 -12)', doorO: flip > 0.97 ? 0 : 1 };
}
function armG(S, R, on) {
  return { disp: vis(on), d: P('M', S.x, S.y, 'L', R.e.x, R.e.y, 'L', R.t.x, R.t.y), sx: nr(S.x), sy: nr(S.y), ex: nr(R.e.x), ey: nr(R.e.y),
    handT: 'translate(' + nr(R.t.x) + ' ' + nr(R.t.y) + ') rotate(' + nr(R.deg) + ')' };
}
// ---- unified, interpolatable face ----
var KC = 1.333;
function eyeP(C, e, cx) {
  var s = e.s || 'open', k = e.sc || 1, sy = e.sy || 1, look = C.look || 1, cy = C.ey;
  if (s === 'arc') { var H = C.ah * 1.4; return [cx - C.aw, cy + C.ah * 0.4, cx + C.aw, cy + C.ah * 0.4, H * KC, -(H - 4.5) * KC]; }
  if (s === 'closed') { var D = C.ah * 0.7; return [cx - C.aw, cy, cx + C.aw, cy, -D * KC, (D + 4) * KC]; }
  var px = cx + (e.dx || 0) * look, py = cy + (e.dy || 0) * look, rx = C.rx * k, ry = C.ry * k * sy;
  return [px - rx, py, px + rx, py, ry * KC, ry * KC];
}
function mouthP(C, m) {
  var x = 100, y = C.my, w = C.mw;
  switch (m) {
    case 'big': return [x - w * 1.2, y - 2, x + w * 1.2, y - 2, 0, 0, w * 1.3 * KC, w * 1.3 * KC];
    case 'side': return [x - w * 0.5, y + 3, x + w * 0.8, y - 2, 2.5, 2.5, 6.5, 6.5];
    case 'o': return [x - w * 0.34, y + 3, x + w * 0.34, y + 3, -w * 0.44 * KC, -w * 0.44 * KC, w * 0.44 * KC, w * 0.44 * KC];
    case 'flat': return [x - w * 0.5, y + 3, x + w * 0.5, y + 3, -1, -1, 1, 1];
    case 'frown': return [x - w * 0.7, y + 6, x + w * 0.7, y + 6, -9, -9, -4.5, -4.5];
    case 'wave': return [x - w * 0.8, y + 4, x + w * 0.8, y + 4, -7, 7, -3.5, 10.5];
    case 'smirk': return [x - w * 0.7, y + 1, x + w * 0.9, y - 4, 5, 5, 9, 9];
    default: return [x - w, y, x + w, y, w * 0.6 * KC, w * 0.6 * KC, (w * 0.6 + 3.2) * KC, (w * 0.6 + 3.2) * KC];
  }
}
function browP(C, b) {
  var a = C.ex1, c = C.ex2, by = C.ey - C.bg, w = C.bw;
  switch (b) {
    case 'raise': return [a - w, by + 1, a, by - 2, a + w, by + 1, c - w, by - 5, c, by - 12, c + w, by - 5, 1];
    case 'up': return [a - w, by - 4, a, by - 11, a + w, by - 4, c - w, by - 4, c, by - 11, c + w, by - 4, 1];
    case 'sad': return [a - w, by + 2, a, by - 1, a + w, by - 4, c - w, by - 4, c, by - 1, c + w, by + 2, 1];
    case 'angry': return [a - w, by - 3, a, by, a + w, by + 3, c - w, by + 3, c, by, c + w, by - 3, 1];
    default: return [a - w, by, a, by - 3, a + w, by, c - w, by, c, by - 3, c + w, by, 0];
  }
}
function faceVec(C, md) {
  var t = md.t || {};
  return [].concat(eyeP(C, md.L, C.ex1), eyeP(C, md.R, C.ex2), mouthP(C, md.m), browP(C, md.b), [t.r || 0, t.ty || 0, t.s || 1]);
}
function bootProg(bk) {
  var p = clamp((bk - 0.2) / 0.35);
  var e = function (t) { return 1 - Math.pow(1 - t, 3); };
  var sm = function (t) { return t * t * (3 - 2 * t); };
  return 0.38 * e(clamp(p / 0.35)) + 0.22 * sm(clamp((p - 0.47) / 0.18)) + 0.4 * e(clamp((p - 0.7) / 0.3));
}
function bootVec(C, bk) {
  var seg = function (a, c) { return clamp((bk - a) / (c - a)); };
  var sm = function (t) { return t * t * (3 - 2 * t); };
  var eoc = function (t) { return 1 - Math.pow(1 - t, 3); };
  var cy = C.ey, my = C.my, H = 2.5;
  var pr = bootProg(bk);
  var x0 = 70, x1 = 70 + 2 * H + (60 - 2 * H) * pr;
  var rx = (x1 - x0) / 2, ccx = (x0 + x1) / 2;
  var k3 = sm(seg(0.6, 0.72)), k4 = seg(0.72, 0.84), k5 = sm(seg(0.93, 0.99));
  rx = rx - 20 * k3;
  var ry = H + (C.ry - H) * eob(k4);
  var bt = seg(0.86, 0.92); if (bt > 0 && bt < 1) ry *= 1 - 0.85 * Math.sin(Math.PI * bt);
  var lx = ccx - (ccx - C.ex1) * k3, rxx = ccx + (C.ex2 - ccx) * k3;
  var eyes = [lx - rx, cy, lx + rx, cy, ry * KC, ry * KC, rxx - rx, cy, rxx + rx, cy, ry * KC, ry * KC];
  var mr = 2.6 * sm(seg(0.62, 0.74)), mY = cy + (my - cy) * eoc(seg(0.62, 0.76));
  var dot = [100 - mr, mY, 100 + mr, mY, -mr * KC, -mr * KC, mr * KC, mr * KC];
  var mouth = lerpA(dot, mouthP(C, 'smile'), sm(k4));
  var v = [].concat(eyes, mouth, browP(C, null), [0, 0, 1]);
  if (k5 > 0) v = lerpA(v, faceVec(C, MOODS[1]), k5);
  return v;
}
function eyeD(v, i, bl) {
  var x0 = v[i], y0 = v[i + 1], x1 = v[i + 2], y1 = v[i + 3], kt = v[i + 4] * bl, kb = v[i + 5] * bl;
  return P('M', x0, y0, 'C', x0, y0 - kt, x1, y1 - kt, x1, y1, 'C', x1, y1 + kb, x0, y0 + kb, x0, y0, 'Z');
}
function mouthD(v, i) {
  var x0 = v[i], y0 = v[i + 1], x1 = v[i + 2], y1 = v[i + 3], W = x1 - x0;
  return P('M', x0, y0, 'C', x0 + W * 0.1, y0 + v[i + 4], x1 - W * 0.1, y1 + v[i + 5], x1, y1,
    'C', x1 - W * 0.1, y1 + v[i + 7], x0 + W * 0.1, y0 + v[i + 6], x0, y0, 'Z');
}
function browD(v, i) {
  return P('M', v[i], v[i + 1], 'Q', v[i + 2], v[i + 3], v[i + 4], v[i + 5], 'M', v[i + 6], v[i + 7], 'Q', v[i + 8], v[i + 9], v[i + 10], v[i + 11]);
}
function geomOf(name) { var s = SHAPES[name]; return { b: s.b.slice(), p: s.p.slice(), stand: s.stand }; }
function lerpA(a, b, k) { return a.map(function (v, i) { return v + (b[i] - v) * k; }); }
function easeOutBack(k) { var c1 = 1.25, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
function vis(b) { return b ? 'inline' : 'none'; }
function sq(sel, size) {
  return 'width: ' + size + 'px; height: ' + size + 'px; box-sizing: border-box; padding: 4px; border-radius: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-family: inherit; color: #1D1D1F; background: ' + (sel ? '#E8E8ED' : '#F5F5F7') + '; border: 2px solid ' + (sel ? '#1D1D1F' : 'transparent');
}
function toggleStyle(on) {
  return 'width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; border: none; background: ' + (on ? '#1D1D1F' : '#F5F5F7') + '; color: ' + (on ? '#FFFFFF' : '#1D1D1F');
}
class Component extends DCLogic {
  componentDidMount() {
    var self = this;
    this._timer = setInterval(function () {
      var st = self.state || {};
      if (!st.auto) return;
      var cur = st.shape || 'squircle';
      var i = AUTO.indexOf(cur);
      self.go(AUTO[(i + 1) % AUTO.length]);
    }, 2200);
    this._clock = setInterval(function () { self.forceUpdate(); }, 15000);
    var t0 = performance.now();
    this._blinkAt = t0 + 2200; this._blinkStart = -1; this._dbl = false;
    var loop = function () {
      var now = performance.now();
      var T = self._target;
      if (T) {
        if (!self._cur || self._cur.length !== T.length) { self._cur = T.slice(); self._vel = T.map(function () { return 0; }); }
        for (var i = 0; i < T.length; i++) {
          self._vel[i] += (T[i] - self._cur[i]) * 0.16;
          self._vel[i] *= 0.7;
          self._cur[i] += self._vel[i];
        }
      }
      var bl = 0;
      if (now >= self._blinkAt && self._blinkStart < 0) self._blinkStart = now;
      if (self._blinkStart >= 0) {
        var bt = (now - self._blinkStart) / 170;
        if (bt >= 1) {
          self._blinkStart = -1;
          var again = !self._dbl && Math.random() < 0.25;
          self._dbl = again;
          self._blinkAt = now + (again ? 120 : 2400 + Math.random() * 3200);
        } else bl = bt < 0.5 ? bt * 2 : (1 - bt) * 2;
      }
      self.setState({ fp: self._cur ? self._cur.slice() : null, now: (now - t0) / 1000, blink: bl });
      self._loop = requestAnimationFrame(loop);
    };
    this._loop = requestAnimationFrame(loop);
    if (this.props.autoBoot ?? true) this.boot();
  }
  tween(key, to, dur, done, lin) {
    var self = this;
    var from = (this.state && this.state[key]) || 0;
    var t0 = performance.now();
    if (!this._tw) this._tw = {};
    if (this._tw[key]) cancelAnimationFrame(this._tw[key]);
    if (Math.abs(to - from) < 0.001) { if (done) done(); return; }
    var step = function (now) {
      var k = Math.min(1, (now - t0) / dur);
      var e = lin ? k : (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
      var o = {}; o[key] = from + (to - from) * e;
      self.setState(o);
      if (k < 1) self._tw[key] = requestAnimationFrame(step); else { self._tw[key] = null; if (done) done(); }
    };
    this._tw[key] = requestAnimationFrame(step);
  }
  sequence(next, antOn) {
    var self = this;
    var st = this.state || {};
    var sideNext = ['stop', 'coffee', 'confetti', 'thumb', 'wave', 'umbrella', 'magnifier'].indexOf(next) >= 0 ? next : null;
    var cur = st.shown || null;
    if (cur !== sideNext) {
      var bringIn = function () {
        self.setState({ shown: sideNext, ext: 0 });
        if (sideNext) self.tween('ext', 1, 750);
      };
      if (cur && (st.ext || 0) > 0) this.tween('ext', 0, 420, bringIn); else bringIn();
    } else if (sideNext && (st.ext || 0) < 1) {
      this.tween('ext', 1, 750);
    }
    var antTarget = (antOn || next === 'idea' || next === 'stop') ? 1 : 0;
    this.tween('antExt', antTarget, antTarget ? 600 : 420);
    (this._to || []).forEach(function (t) { clearTimeout(t); });
    this._to = [];
    if (next === 'timer') {
      this.setState({ timerDone: false, press: 0 });
      this._to.push(setTimeout(function () {
        self.tween('extL', 1, 1300, function () {
          self.tween('press', 1, 150, function () {
            self.setState({ timerDone: true });
            self.tween('press', 0, 260, function () {
              self._to.push(setTimeout(function () { self.tween('extL', 0, 1000); }, 500));
            });
          });
        });
      }, 1500));
    } else {
      this.setState({ timerDone: false, press: 0 });
      this.tween('extL', 0, 500);
    }
  }
  boot() {
    var self = this;
    (this._to || []).forEach(function (t) { clearTimeout(t); });
    if (this._bootTo) clearTimeout(this._bootTo);
    this.setState({ mood: 'neutral', act: null, react: null, bootK: 0, timerDone: false, off: false, offK: 0 });
    this.glasses(false);
    this.sequence(null, ((this.state || {}).add || {}).ant);
    this.tween('bootK', 1, 5400, function () {
      self.setState({ bootK: null, mood: 'happy' });
      self._bootTo = setTimeout(function () { if ((self.state || {}).mood === 'happy') self.setState({ mood: 'neutral' }); }, 1800);
    }, true);
  }
  shutdown() {
    var self = this;
    (this._to || []).forEach(function (t) { clearTimeout(t); });
    if (this._bootTo) clearTimeout(this._bootTo);
    if (this._tw && this._tw.bootK) cancelAnimationFrame(this._tw.bootK);
    this.setState({ mood: 'neutral', act: null, react: null, gk: 0, bootK: null, timerDone: false, offK: 0 });
    this.sequence(null, false);
    this.tween('offK', 1, 1100, function () { self.setState({ off: true, offK: 0 }); }, true);
  }
  glasses(on, delay) {
    var self = this;
    if (this._gto) clearTimeout(this._gto);
    this._gto = setTimeout(function () { self.tween('gk', on ? 1 : 0, on ? 3400 : 2800, null, true); }, delay || 0);
  }
  componentWillUnmount() {
    if (this._gto) clearTimeout(this._gto);
    if (this._bootTo) clearTimeout(this._bootTo);
    clearInterval(this._timer);
    clearInterval(this._clock);
    if (this._loop) cancelAnimationFrame(this._loop);
    var tw = this._tw || {};
    Object.keys(tw).forEach(function (k) { if (tw[k]) cancelAnimationFrame(tw[k]); });
    if (this._raf) cancelAnimationFrame(this._raf);
    (this._to || []).forEach(function (t) { clearTimeout(t); });
  }
  go(name) {
    var self = this;
    var st = this.state || {};
    var from = st.geom || geomOf(st.shape || 'squircle');
    var to = geomOf(name);
    var start = performance.now(), dur = 750;
    if (this._raf) cancelAnimationFrame(this._raf);
    this.setState({ shape: name });
    var step = function (now) {
      var k = Math.min(1, (now - start) / dur);
      var e = easeOutBack(k);
      self.setState({ geom: { b: lerpA(from.b, to.b, e), p: lerpA(from.p, to.p, e), stand: Math.max(0, Math.min(1, from.stand + (to.stand - from.stand) * k)) } });
      if (k < 1) self._raf = requestAnimationFrame(step); else self._raf = null;
    };
    this._raf = requestAnimationFrame(step);
  }
  renderVals() {
    var self = this;
    var st = this.state || {};
    var shape = st.shape || 'squircle';
    var geom = st.geom || geomOf(shape);
    var b = geom.b, p = geom.p, stand = geom.stand;
    var base = b[1] + b[3];
    var midY = b[1] + b[3] * 0.5;
    var edge = edgeX(b, midY);
    var hx = Math.min(edge - 6, Math.max(edge - 9, p[0] + p[2] + 6));
    var cur = st.mood || 'neutral';
    var actId = st.act || null, reactId = st.react || null;
    var mood = MOODS.filter(function (m) { return m.id === cur; })[0] || MOODS[0];
    var plain = !reactId && !actId && !st.off && !(st.offK > 0);
    var md = reactId ? REACTS[reactId] : (actId ? READ : mood);
    if (reactId === 'timer' && st.timerDone) md = {L: {s: 'arc'}, R: {s: 'arc'}, m: 'smile', t: {}};
    var bk = (st.bootK == null) ? 1 : st.bootK, booting = bk < 1;
    if (booting) md = bk < 0.93 ? MOODS[0] : MOODS[1];
    var press = st.press || 0;
    if (press > 0) { var t0 = md.t || {}; md = Object.assign({}, md, { t: { r: t0.r || 0, ty: (t0.ty || 0) + press * 4, s: (t0.s || 1) * (1 - press * 0.04) } }); }
    var sym = (!reactId && !actId) ? (mood.sym || '') : '';
    var add = st.add || { ring: true, shadow: true, ant: false, pods: false };
    var q = String(this.props.query ?? 'Intune Richtlinien');
    if (q.length > 18) q = q.slice(0, 17) + '…';
    var tg = {};
    ['ring', 'shadow', 'ant', 'pods'].forEach(function (k) {
      tg[k] = { pressed: add[k] ? 'true' : 'false', pick: function () { var n = Object.assign({}, add); n[k] = !n[k]; self.setState({ add: n }); if (k === 'ant') self.sequence(reactId, n.ant); }, style: toggleStyle(add[k]) };
    });
    var ab = {};
    Object.keys(ACTS).forEach(function (k) {
      ab[k] = { pressed: actId === k ? 'true' : 'false', pick: function () { var na = actId === k ? null : k; var busy = (st.shown && (st.ext || 0) > 0) || (st.extL || 0) > 0; self.setState({ act: na, react: null }); self.sequence(null, add.ant); self.glasses(!!na, na && busy ? 600 : 0); }, style: toggleStyle(actId === k) };
    });
    var rb = {};
    Object.keys(REACTS).forEach(function (k) {
      rb[k] = { pressed: reactId === k ? 'true' : 'false', pick: function () { var nx = reactId === k ? null : k; self.setState({ react: nx, act: null }); self.glasses(false); self.sequence(nx, add.ant); }, style: toggleStyle(reactId === k) };
    });
    var A = ACTS[actId || 'search'];
    var act = { title: A.title, status: A.status, icon: A.icon, lh: A.lh, l1: A.l[0], l2: A.l[1], l3: A.l[2], rl: A.rl, rv: A.rv,
      iconT: 'translate(48.5 119.2) scale(0.3)', q: q, caretX: nr(64.6 + q.length * 3.35),
      u0: 'learn.microsoft.com', t0: q + ' – Überblick', u1: 'heise.de › ratgeber', t1: 'So richtest du es ein', u2: 'reddit.com › r/sysadmin', t2: 'Erfahrungen aus der Praxis' };
    A.bars.forEach(function (h, i) { act['bh' + i] = nr(h * 1.6); act['by' + i] = nr(170 - h * 1.6); });
    var shown = st.shown || null, ext = st.ext || 0, antExt = st.antExt || 0, extL = st.extL || 0;
    var hxR = hx, hxL = 200 - hx;
    var topK = clamp(antExt / 0.3);
    // right arm + tool
    var SR = { x: hxR, y: midY };
    var u = clamp((ext - 0.22) / 0.38), tt = clamp((ext - 0.6) / 0.4);
    var fsc0 = Math.min(p[2] / 120, p[3] / 92);
    var ER = { x: p[0] + p[2] / 2 + 20 * fsc0, y: p[1] + p[3] / 2 - 2 * fsc0 };
    var TF = { stop: [edge + 14, midY - 34], coffee: [edge + 20, midY - 20], confetti: [edge + 20, midY - 8], thumb: [edge + 18, midY - 24],
      wave: [edge + 18, midY - 40], umbrella: [edge + 12, midY - 22], magnifier: [ER.x + 14, ER.y + 26] }[shown || 'stop'] || [edge + 14, midY - 34];
    if (shown === 'wave' && ext > 0.95) { TF = [TF[0] + Math.sin((st.now || 0) * 9) * 6, TF[1] + Math.cos((st.now || 0) * 9) * 1.5]; }
    var TR = { x: SR.x + (TF[0] - SR.x) * u, y: SR.y + (TF[1] - SR.y) * u };
    var LR = 3 + 19 * u;
    var RR = ik(SR, TR, LR, LR, 1);
    var hand = RR.t;
    var umbTop = { x: 112 - hand.x, y: b[1] - 18 - hand.y };
    var umbK = clamp(tt / 0.4), umbOpen = eob(clamp((tt - 0.4) / 0.6));
    var magC = { x: (ER.x - hand.x) * clamp(tt / 0.5), y: (ER.y - hand.y) * clamp(tt / 0.5) };
    var mlen = Math.sqrt(magC.x * magC.x + magC.y * magC.y) || 1;
    var wd = [];
    for (var wi = 0; wi < 8; wi++) wd.push('rotate(' + nr(wi * 45 * eob(clamp(tt * 1.5 - wi * 0.06))) + ')');
    var poleL = 16 * clamp(tt / 0.3);
    var signK = clamp((tt - 0.1) / 0.3);
    var barK = clamp((tt - 0.75) / 0.25);
    var segK = clamp(tt / 0.55), rotK = clamp((tt - 0.45) / 0.55);
    var c2x = -2 + 11 * segK, c3x = c2x + 2 + 10 * segK, mx = c3x + 10;
    var canDeg = -38 * eob(rotK);
    var cr = canDeg * Math.PI / 180;
    var muzzle = { x: hand.x + Math.cos(cr) * (mx + 2), y: hand.y + Math.sin(cr) * (mx + 2) };
    // left arm (timer press)
    var SL = { x: hxL, y: midY };
    var uL = clamp((extL - 0.22) / 0.38), tL = clamp((extL - 0.6) / 0.4);
    var Pm = { x: hxL - 18, y: b[1] + 22 }, Pt = { x: 96, y: b[1] - 4 + press * 3 }, Cc = { x: hxL - 16, y: b[1] - 30 };
    var TLp = tL > 0 ? quad(Pm, Cc, Pt, tL) : { x: SL.x + (Pm.x - SL.x) * uL, y: SL.y + (Pm.y - SL.y) * uL };
    var LL = 3 + 37 * uL + 22 * tL;
    var RL = ik(SL, TLp, LL, LL, -1);
    // glasses: take out of the right hatch and put on with both hands
    var gk = st.gk || 0;
    var fsc = Math.min(p[2] / 120, p[3] / 92), pcx = p[0] + p[2] / 2, pcy = p[1] + p[3] / 2;
    var Gp = function (x, y) { return { x: pcx + (x - 100) * fsc, y: pcy + (y - 98) * fsc }; };
    var lerpP = function (a, c, t) { return { x: a.x + (c.x - a.x) * t, y: a.y + (c.y - a.y) * t }; };
    var sm = function (t) { return t * t * (3 - 2 * t); };
    var seg = function (a, c) { return sm(clamp((gk - a) / (c - a))); };
    var E0 = Gp(100, 96), C1 = { x: 100, y: p[1] + p[3] + 14 };
    var restR = { x: edge + 10, y: midY - 10 }, restL = { x: 200 - edge - 10, y: midY - 10 }, pocketR = { x: hxR + 1, y: midY };
    var gc = E0, gsc = 1, gr = 0, gOn = gk >= 0.2;
    var gArms = gk > 0.001 && gk < 0.999;
    var hOpenG = seg(0, 0.08) * (1 - seg(0.93, 1));
    if (gArms) {
      var uf = seg(0, 0.12) * (1 - seg(0.86, 0.95));
      var RH, LH, off = function (sc, sgnx) { return { x: sgnx * 37 * fsc * sc, y: 0 }; };
      if (gk < 0.12) { RH = lerpP(SR, restR, uf); LH = lerpP(SL, restL, uf); }
      else if (gk < 0.3) {
        var t1 = seg(0.12, 0.2), t2 = seg(0.2, 0.3);
        RH = gk < 0.2 ? lerpP(restR, pocketR, t1) : lerpP(pocketR, restR, t2); LH = restL;
        gc = RH; gsc = 0.25; gr = 90;
      } else if (gk < 0.55) {
        var tc = seg(0.3, 0.55);
        gc = lerpP(restR, C1, tc); gsc = 0.25 + 0.5 * tc; gr = 90 * (1 - tc);
        var o1 = off(gsc, 1), o2 = off(gsc, -1);
        RH = { x: gc.x + o1.x, y: gc.y + o1.y }; LH = lerpP(restL, { x: gc.x + o2.x, y: gc.y + o2.y }, tc);
      } else if (gk < 0.78) {
        var td = seg(0.55, 0.78);
        gc = lerpP(C1, E0, td); gsc = 0.75 + 0.25 * td;
        var o3 = off(gsc, 1), o4 = off(gsc, -1);
        RH = { x: gc.x + o3.x, y: gc.y + o3.y }; LH = { x: gc.x + o4.x, y: gc.y + o4.y };
      } else {
        var o5 = off(1, 1), o6 = off(1, -1), te = seg(0.78, 0.88), tr = seg(0.86, 0.95);
        RH = lerpP(lerpP({ x: E0.x + o5.x, y: E0.y + o5.y }, restR, te), SR, tr);
        LH = lerpP(lerpP({ x: E0.x + o6.x, y: E0.y + o6.y }, restL, te), SL, tr);
      }
      var Lg = 4 + 30 * Math.max(uf, 0.15);
      RR = ik(SR, RH, Lg, Lg, 1); RL = ik(SL, LH, Lg, Lg, -1);
    }
    var glow = this.props.glow ?? '#FFFFFF';
    var s = Math.min(p[2] / 120, p[3] / 92);
    var sm = function (t) { return t * t * (3 - 2 * t); };
    var isOff = !!st.off, offK = st.offK || 0, crtX = 1, crtY = 1, ov = 0;
    if (offK > 0) {
      crtY = 1 - 0.975 * sm(clamp(offK / 0.32)); crtX = 1 - 0.98 * sm(clamp((offK - 0.36) / 0.3));
      ov = offK < 0.32 ? 0.25 + 0.7 * clamp(offK / 0.32) : 0.95 * (1 - sm(clamp((offK - 0.68) / 0.32)));
    }

    // target vector + spring-smoothed current + idle motion
    var T = faceVec(CFG, md);
    this._target = T;
    var v = (st.fp && st.fp.length === T.length) ? st.fp.slice() : T.slice();
    if (booting) { v = bootVec(CFG, bk); this._target = v.slice(); }
    var tn = st.now || 0;
    var eyesOpen = !md.L.s && !md.R.s && !booting;
    var lookX = 0, lookY = 0, bodyTy = Math.sin(tn * 1.9) * 0.9, bodyS = 1 + Math.sin(tn * 1.9) * 0.006, bodyR = 0;
    var gz = self.gaze;
    if (gz && !actId) {
      // Bluey: the eyes follow a point (the cursor), -1…1 in both directions.
      var gs = self._gs || (self._gs = { x: gz.x, y: gz.y });
      gs.x += (gz.x - gs.x) * 0.2; gs.y += (gz.y - gs.y) * 0.2;  // eased, so updates a few times a second still glide
      lookX = 14 * gs.x; lookY = 9 * gs.y;
    } else {
      if (eyesOpen && !actId && !reactId && (cur === 'neutral' || cur === 'focus')) { lookX = 2.2 * Math.sin(tn * 0.55) * Math.sin(tn * 0.23 + 1); }
      if (md.L.dx || md.L.dy < 0) { lookX += 1.6 * Math.sin(tn * 1.4); lookY += 0.8 * Math.sin(tn * 2.1); }
      if (actId) { lookX += 2.5 * Math.sin(tn * 2.6); }
    }
    if (md.m === 'big') bodyTy -= Math.abs(Math.sin(tn * 5)) * 1.6;
    if (cur === 'sleep' && !actId && !reactId) { bodyTy = Math.sin(tn * 1.1) * 2.2; bodyS = 1 + Math.sin(tn * 1.1) * 0.015; }
    if ((cur === 'oops' || cur === 'meh') && !actId && !reactId) bodyR = Math.sin(tn * 3) * 1.2;
    if (cur === 'confused' && !actId && !reactId) bodyR = Math.sin(tn * 1.3) * 3;
    if (reactId === 'music') { bodyR = Math.sin(tn * 3.2) * 4; bodyTy -= Math.abs(Math.sin(tn * 3.2)) * 1.5; }
    if (reactId === 'battery') { bodyTy += Math.sin(tn * 0.9) * 0.6; }
    if (eyesOpen) { v[0] += lookX; v[2] += lookX; v[6] += lookX; v[8] += lookX; v[1] += lookY; v[3] += lookY; v[7] += lookY; v[9] += lookY; }
    var bl = eyesOpen ? 1 - 0.92 * (st.blink || 0) : 1;
    if (booting) { bodyTy = 0; bodyS = 1; bodyR = 0; }
    var br = v[33] + bodyR, bty = v[34] + bodyTy, bs = v[35] * bodyS;
    var heroF = {
      pu: eyeD(v, 0, bl) + ' ' + eyeD(v, 6, bl),
      m: mouthD(v, 12), mo: booting && bk < 0.62 ? 0 : 1, eo: booting ? nr(clamp((bk - 0.14) / 0.05)) : 1,
      brow: browD(v, 20), bo: nr(Math.max(0, Math.min(1, v[32]))),
      tf: 'translate(0 ' + nr(bty) + ') rotate(' + nr(br) + ' 100 ' + nr(base) + ') translate(100 ' + nr(base) + ') scale(' + nr(2 - bs) + ' ' + nr(bs) + ') translate(-100 ' + nr(-base) + ')'
    };
    return {
      f: heroF,
      bt: (function () {
        var gIn = sm(clamp(bk / 0.08)), gOut = sm(clamp((bk - 0.1) / 0.1));
        var tw = sm(clamp((bk - 0.06) / 0.1));
        var to = clamp((bk - 0.06) / 0.04) * (1 - clamp((bk - 0.55) / 0.05));
        var pr = bootProg(bk);
        return { go: nr(gIn * (1 - gOut)), gr: nr(30 + 30 * gIn), gry: nr(16 + 10 * gIn), tx: nr(100 - 30 * tw), tw: nr(60 * tw),
          to: nr(to * 0.22), po: nr(clamp((bk - 0.14) / 0.05) * (1 - clamp((bk - 0.55) / 0.05)) * 0.75), pct: Math.round(pr * 100) + ' %' };
      })(),
      bootPick: function () { if (isOff) self.boot(); else self.shutdown(); },
      bootStyle: toggleStyle(!isOff),
      g: {
        bodyD: shapePath(b),
        px: nr(p[0]), py: nr(p[1]), pw: nr(p[2]), ph: nr(p[3]), pr: nr(p[4]),
        rx: nr(p[0] - 3), ry: nr(p[1] - 3), rw: nr(p[2] + 6), rh: nr(p[3] + 6), rr: nr(p[4] + 3),
        reflD: P('M', p[0] + 14, p[1] + 22, 'Q', p[0] + 20, p[1] + 10, p[0] + 34, p[1] + 7),
        faceT: 'translate(' + nr(p[0] + p[2] / 2) + ' ' + nr(p[1] + p[3] / 2) + ') scale(' + nr(s * crtX) + ' ' + nr(s * crtY) + ') translate(-100 -98)',
        ov: nr(ov),
        antD: P('M', 100, b[1], 'L', 100, b[1] - 14), antY: nr(b[1] - 17),
        podL: nr(b[0] - 12), podR: nr(b[0] + b[2] - 4), podY: nr(p[1] + p[3] / 2 - 22),
        shY: nr(base + 12 + stand * 14), shRx: nr(b[2] * 0.4),
        stand: nr(stand), standDisp: vis(stand > 0.02),
        neckD: P('M', 88, base - 2, 'L', 84, base + 16, 'L', 116, base + 16, 'L', 112, base - 2, 'Z'), footY: nr(base + 14),
        symT: 'translate(' + nr(p[0] + p[2] - 22) + ' ' + nr(p[1] + 28) + ')',
        rightT: 'translate(' + nr(edge) + ' ' + nr(midY) + ')',
        hatchT: 'translate(' + nr(hx) + ' ' + nr(midY) + ')',
        hR: hatchG(hxR, midY, 1, gArms ? 0.22 * hOpenG : ext), hL: hatchG(hxL, midY, -1, gArms ? 0.22 * hOpenG : extL),
        aR: armG(SR, RR, gArms ? gk > 0.04 && gk < 0.95 : (!!shown && ext > 0.22)), aL: armG(SL, RL, gArms ? gk > 0.04 && gk < 0.95 : extL > 0.22),
        glT: 'translate(' + nr(gc.x) + ' ' + nr(gc.y) + ') scale(' + nr(fsc * gsc) + ') rotate(' + nr(gr) + ') translate(-100 -96)',
        toolT: 'translate(' + nr(hand.x) + ' ' + nr(hand.y) + ')',
        pole: P('M', 0, -4, 'V', -4 - poleL),
        signT: 'translate(0 ' + nr(-4 - poleL - 20) + ') scale(' + nr(0.3 + 0.7 * signK) + ')',
        w0: wd[0], w1: wd[1], w2: wd[2], w3: wd[3], w4: wd[4], w5: wd[5], w6: wd[6], w7: wd[7],
        barO: nr(barK), barT: 'scale(' + nr(barK) + ' 1)',
        canT: 'rotate(' + nr(canDeg) + ') scale(' + nr(0.4 + 0.6 * clamp(tt / 0.2)) + ')',
        recoilC: tt >= 0.999 ? 'recoil' : '',
        finT: 'translate(0 0) scale(1 ' + nr(clamp((tt - 0.3) / 0.3)) + ')',
        c2x: nr(c2x), c2r: nr(c2x + 8), c3x: nr(c3x), c3r: nr(c3x + 6), mx: nr(mx), mx2: nr(mx + 6),
        confT: 'translate(' + nr(muzzle.x) + ' ' + nr(muzzle.y) + ')',
        cofT: 'translate(' + nr(4) + ' ' + nr(-2) + ') scale(' + nr(0.3 + 0.7 * eob(clamp(tt))) + ')',
        toolS: 'scale(' + nr(0.3 + 0.7 * eob(clamp(tt))) + ')',
        umbD: P('M', 0, 0, 'L', umbTop.x * umbK, umbTop.y * umbK),
        umbT: 'translate(' + nr(umbTop.x * umbK) + ' ' + nr(umbTop.y * umbK) + ') scale(' + nr(0.08 + 0.92 * umbOpen) + ' ' + nr(0.4 + 0.6 * umbOpen) + ')',
        magH: P('M', 0, 0, 'L', magC.x - magC.x / mlen * 16 * tt, magC.y - magC.y / mlen * 16 * tt),
        magT: 'translate(' + nr(magC.x) + ' ' + nr(magC.y) + ') scale(' + nr(clamp(tt)) + ')',
        trT: 'translate(' + nr(b[0] + b[2] - 14) + ' ' + nr(b[1] + 4) + ')',
        tlT: 'translate(' + nr(b[0] + 14) + ' ' + nr(b[1] + 4) + ')',
        wsT: 'translate(' + nr(ER.x + 18) + ' ' + nr(ER.y - 16) + ')',
        handleT: 'rotate(' + nr(-90 * (1 - clamp((tt - 0.5) / 0.5))) + ' 11 3)',
        rpx: 96, rpy: nr(b[1] - 2), rpr: nr(4 + 12 * press), rpo: nr(press),
        tslotO: nr(topK), lidT: 'translate(0 ' + nr(-1.4 * clamp(topK / 0.3) * (1 - clamp((topK - 0.3) / 0.7))) + ') translate(0 3) scale(1 ' + nr(1 - clamp((topK - 0.3) / 0.7)) + ') translate(0 -3)', lidO: topK > 0.97 ? 0 : 1,
        rodOff: nr(17 * (1 - antExt)), lampT: 'translate(0 ' + nr(26 * (1 - antExt)) + ') translate(0 -27) scale(' + nr(0.35 + 0.65 * antExt) + ') translate(0 27)',
        leftT: 'translate(' + nr(b[0]) + ' ' + nr(midY) + ')',
        topT: 'translate(100 ' + nr(b[1] - 22) + ')',
        topHT: 'translate(100 ' + nr(b[1] + 7) + ')',
        antClass: reactId === 'stop' ? 'alarm' : '',
        lampR: reactId === 'idea' ? 9 : 7
      },
      v: {
        ring: vis((add.ring || reactId === 'stop') && !(booting && bk < 0.72) && !isOff && offK < 0.3), shadow: vis(add.shadow), ant: vis(antExt > 0.001), pods: vis(add.pods || reactId === 'music'), ideaFx: vis(reactId === 'idea' && antExt > 0.9),
        scr_search: vis(actId === 'search'), scr_tasks: vis(actId === 'tasks'), scr_mail: vis(actId === 'mail'), scr_cal: vis(actId === 'cal'), scr_run: vis(actId === 'run'),
        face: vis(!(reactId === 'timer' && !st.timerDone) && reactId !== 'battery' && !isOff), crt: vis(ov > 0.01), bootBar: vis(booting && bk < 0.62 && !isOff), timer: vis(reactId === 'timer' && !st.timerDone), glasses: vis(gOn),
        hud: vis(!!actId && gk > 0.999), zzz: vis(sym === 'zzz' && !isOff), glyph: vis(sym && sym !== 'zzz' && !isOff), hearts: vis(reactId === 'heart'),
        tStop: vis(shown === 'stop' && tt > 0), tThumb: vis(shown === 'thumb' && tt > 0), tWave: vis(shown === 'wave' && tt > 0), tUmb: vis(shown === 'umbrella' && tt > 0), tMag: vis(shown === 'magnifier' && tt > 0),
        rain: vis(shown === 'umbrella' && tt > 0.99), notes: vis(reactId === 'music'), battery: vis(reactId === 'battery'),
        dThink: vis(plain && cur === 'think'), dHappy: vis((plain && cur === 'happy') || (booting && bk >= 0.94)), dWow: vis(plain && cur === 'wow'), dFocus: vis(plain && cur === 'focus'), dOops: vis(plain && cur === 'oops'), dWink: vis(plain && cur === 'wink'), dMeh: vis(plain && cur === 'meh'), dConf: vis(plain && cur === 'confused'), tCan: vis(shown === 'confetti' && tt > 0), tCof: vis(shown === 'coffee' && tt > 0), confFx: vis(shown === 'confetti' && tt > 0.999)
      },
      glyphText: sym && sym !== 'zzz' ? sym : '',
      hud: HUD,
      act: act,
      tg: tg, ab: ab, rb: rb,
      shapes: ORDER.map(function (id) {
        return { label: SHAPES[id].label, d: shapePath(SHAPES[id].b), pressed: id === shape ? 'true' : 'false', pick: function () { self.setState({ auto: false }); self.go(id); }, style: sq(id === shape, 56) };
      }),
      autoPressed: st.auto ? 'true' : 'false',
      toggleAuto: function () { var on = !st.auto; self.setState({ auto: on }); if (on) { var i = AUTO.indexOf(shape); self.go(AUTO[(i + 1) % AUTO.length]); } },
      autoStyle: toggleStyle(!!st.auto),
      playDisp: vis(!st.auto), pauseDisp: vis(!!st.auto),
      moods: MOODS.map(function (m) {
        var sel = m.id === cur && !actId && !reactId;
        var sm = m.sym === 'zzz' ? 'z' : (m.sym || '');
        return { label: m.label, f: face(CFG, m, 174), sym: sm, symDisp: vis(!!m.sym), hudDisp: 'none', pressed: sel ? 'true' : 'false', pick: function () { self.setState({ mood: m.id, act: null, react: null }); self.glasses(false); self.sequence(null, add.ant); }, style: sq(sel, 64) };
      }),
      body: this.props.body ?? '#FFFFFF',
      glow: reactId === 'stop' ? '#FF453A' : glow,
      glowBase: glow,
      clock: (function () { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); })(),
      dateStr: new Date().toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' }),
      lamp: reactId === 'stop' ? '#FF453A' : (reactId === 'idea' ? '#FFD60A' : glow)
    };
  }
}

const kaGet = (o, path) => path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), o);
const KA_HOLE = /\{\{\s*([\w.$]+)\s*\}\}/g;
const KA_SINGLE = /^\{\{\s*([\w.$]+)\s*\}\}$/;

class KeramikAvatar extends HTMLElement {
  static get observedAttributes() { return ['body', 'glow', 'query', 'mood', 'shape', 'reaction', 'activity']; }

  /** Verfügbare Werte für die API */
  static get moods() { return MOODS.map((m) => m.id); }
  static get reactions() { return Object.keys(REACTS); }
  static get activities() { return Object.keys(ACTS); }
  static get shapes() { return ORDER.slice(); }
  static get addons() { return ['ring', 'shadow', 'ant', 'pods']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._binds = [];
  }

  connectedCallback() {
    if (this._c) return;
    this.shadowRoot.innerHTML = '<style>' + KA_CSS + '</style>' + KA_SVG;
    this._collect();
    const c = (this._c = new Component());
    c._host = this;
    c.props = {
      body: this.getAttribute('body') || undefined,
      glow: this.getAttribute('glow') || undefined,
      query: this.getAttribute('query') || undefined,
      autoBoot: this.hasAttribute('boot')
    };
    c.componentDidMount();
    if (this.getAttribute('shape')) this.setShape(this.getAttribute('shape'));
    if (this.getAttribute('mood')) this.setMood(this.getAttribute('mood'));
    this._update();
  }

  disconnectedCallback() {
    if (this._c) { this._c.componentWillUnmount(); this._c = null; }
  }

  attributeChangedCallback(name, oldV, v) {
    const c = this._c;
    if (!c || oldV === v) return;
    if (name === 'body' || name === 'glow' || name === 'query') { c.props[name] = v || undefined; this._schedule(); }
    if (name === 'mood' && v) this.setMood(v);
    if (name === 'shape' && v) this.setShape(v);
    if (name === 'reaction') this.react(v || null);
    if (name === 'activity') this.activity(v || null);
  }

  // ---------- öffentliche API ----------
  /** Mimik setzen: neutral, happy, think, wow, focus, oops, wink, sleep, question, alert, meh, confused */
  setMood(id) {
    const c = this._c; if (!c) return this;
    c.setState({ mood: id, act: null, react: null });
    c.glasses(false);
    c.sequence(null, this._add().ant);
    return this;
  }
  /** Reaktion abspielen (null beendet): stop, idea, heart, timer, confetti, coffee, thumb, wave, umbrella, magnifier, music, battery */
  react(id) {
    const c = this._c; if (!c) return this;
    c.setState({ react: id || null, act: null });
    c.glasses(false);
    c.sequence(id || null, this._add().ant);
    return this;
  }
  /** Aktivität mit HUD starten (null beendet): search, tasks, mail, cal, run. opts.query = Suchbegriff */
  activity(id, opts) {
    const c = this._c; if (!c) return this;
    if (opts && opts.query != null) c.props.query = String(opts.query);
    const st = c.state || {};
    const busy = (st.shown && (st.ext || 0) > 0) || (st.extL || 0) > 0;
    c.setState({ act: id || null, react: null });
    c.sequence(null, this._add().ant);
    c.glasses(!!id, id && busy ? 600 : 0);
    return this;
  }
  /** Blickrichtung (Bluey): x, y je -1…1; null = Augen wandern wieder selbst */
  look(x, y) {
    const c = this._c; if (!c) return this;
    c.gaze = x == null ? null : { x: Math.max(-1, Math.min(1, +x || 0)), y: Math.max(-1, Math.min(1, +y || 0)) };
    return this;
  }
  /** Körperform: squircle, kapsel, kiesel, helm, monitor */
  setShape(name) { const c = this._c; if (!c) return this; c.setState({ auto: false }); c.go(name); return this; }
  /** Automatisch zwischen Squircle, Kapsel, Kiesel und Helm wechseln */
  autoMorph(on) {
    const c = this._c; if (!c) return this;
    c.setState({ auto: !!on });
    if (on) { const i = AUTO.indexOf((c.state || {}).shape || 'squircle'); c.go(AUTO[(i + 1) % AUTO.length]); }
    return this;
  }
  /** Add-on an/aus: ring, shadow, ant (Antenne), pods (Ohrmuscheln) */
  addon(name, on) {
    const c = this._c; if (!c) return this;
    const n = Object.assign({}, this._add()); n[name] = !!on;
    c.setState({ add: n });
    if (name === 'ant') c.sequence((c.state || {}).react || null, n.ant);
    return this;
  }
  /** Farben: { body: '#FFFFFF', glow: '#FFFFFF' } */
  setColors(o) { const c = this._c; if (!c) return this; Object.assign(c.props, o || {}); this._schedule(); return this; }
  /** Boot-Animation abspielen */
  boot() { if (this._c) this._c.boot(); return this; }
  /** Ausschalten mit Röhrenfernseher-Effekt; boot() schaltet wieder ein */
  shutdown() { if (this._c) this._c.shutdown(); return this; }

  // ---------- intern ----------
  _add() { return (this._c.state || {}).add || { ring: true, shadow: true, ant: false, pods: false }; }

  _collect() {
    const root = this.shadowRoot;
    root.querySelectorAll('*').forEach((el) => {
      Array.from(el.attributes).forEach((at) => {
        if (at.name.indexOf('data-bind-') !== 0) return;
        const tpl = at.value, m = tpl.match(KA_SINGLE);
        this._binds.push({ el, attr: at.name.slice(10), tpl, path: m ? m[1] : null, last: undefined });
      });
    });
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (n.nodeValue.indexOf('{{') < 0) continue;
      const tpl = n.nodeValue, m = tpl.trim().match(KA_SINGLE);
      this._binds.push({ node: n, tpl, path: m ? m[1] : null, last: undefined });
    }
  }

  _schedule() {
    if (this._pending) return;
    this._pending = true;
    requestAnimationFrame(() => { this._pending = false; this._update(); });
  }

  _update() {
    if (!this._c) return;
    const v = this._c.renderVals();
    for (const b of this._binds) {
      let val = b.path ? kaGet(v, b.path) : b.tpl.replace(KA_HOLE, (_, p) => { const x = kaGet(v, p); return x == null ? '' : x; });
      if (val == null) val = '';
      val = String(val);
      if (val === b.last) continue;
      b.last = val;
      if (b.node) b.node.nodeValue = val;
      else b.el.setAttribute(b.attr, val);
    }
  }
}

if (!customElements.get('keramik-avatar')) customElements.define('keramik-avatar', KeramikAvatar);
export { KeramikAvatar };
export default KeramikAvatar;
