import { Request, Response, NextFunction } from 'express';
export class AppError extends Error { constructor(public status:number, message:string, public code='APP_ERROR'){ super(message); } }
export const notFound=(req:Request,res:Response)=>res.status(404).json({error:{code:'NOT_FOUND',message:`Route ${req.path} not found`}});
export function errorHandler(err:Error, _req:Request, res:Response, _next:NextFunction){
 const e=err as AppError; res.status(e.status||500).json({error:{code:e.code||'INTERNAL_ERROR',message:e.message||'Internal server error'}});
}
