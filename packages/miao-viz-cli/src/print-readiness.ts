import type { PdfLayoutIssue } from './pdf-export-types'

export const PRINT_DIAGNOSTIC_SCRIPT = `(function(mode){
  var issues=[];
  if(document.documentElement.scrollWidth > document.documentElement.clientWidth + 2){
    issues.push({code:'PDF_HORIZONTAL_OVERFLOW',direction:'right',message:'Content exceeds printable width.',suggestion:'Reduce chart width or use landscape orientation.'});
  }
  if(mode==='deck'){
    document.querySelectorAll('.slide').forEach(function(el,index){
      var rect=el.getBoundingClientRect();
      if(el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2){
        issues.push({code:'PDF_LAYOUT_OVERFLOW',elementId:el.id||'slide-'+(index+1),page:index+1,direction:el.scrollWidth>el.clientWidth?'horizontal':'vertical',message:'Slide content exceeds its page.',suggestion:'Reduce slide content density or adjust the layout.'});
      }
      if(rect.width < 1 || rect.height < 1) issues.push({code:'PDF_LAYOUT_OVERFLOW',page:index+1,message:'Slide has no printable area.',suggestion:'Check print visibility styles.'});
    });
  }
  document.querySelectorAll('[data-miao-chart]').forEach(function(el,index){
    if(el.scrollHeight > 1200) issues.push({code:'PDF_CONTENT_DENSE',elementId:el.getAttribute('data-miao-chart')||'chart-'+(index+1),message:'Chart block is unusually dense.',suggestion:'Split the block or reduce detail.'});
  });
  return issues;
})`

export function hardLayoutIssues(issues: PdfLayoutIssue[]): PdfLayoutIssue[] {
  return issues.filter(issue => issue.code !== 'PDF_CONTENT_DENSE')
}
