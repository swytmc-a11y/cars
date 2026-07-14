export function financialHealthScore(income:number, spending:number, savings:number){
 const savingsRate=income>0?savings/income:0; const spendRate=income>0?spending/income:1;
 return Math.max(0, Math.min(100, Math.round(45*savingsRate + 55*(1-Math.min(1, spendRate)))));
}
export function recommendations(income:number, spending:number, savings:number){
 const score=financialHealthScore(income,spending,savings); const rec=[] as string[];
 if(spending>income*.8) rec.push('خفّض المصروفات المتغيرة هذا الأسبوع بنسبة 10٪ للحفاظ على الرصيد.');
 if(savings<income*.1) rec.push('فعّل الادخار التلقائي بنسبة لا تقل عن 10٪ من الراتب.');
 if(score>75) rec.push('أداؤك المالي ممتاز، يمكنك زيادة هدف الادخار طويل الأجل.');
 return {score,recommendations:rec};
}
