import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Observable } from 'rxjs';

export const authTokenInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next) => {
  const token = localStorage.getItem('authToken');

  // Clone request and set credentials for cross-origin requests
  let clonedReq = req.clone({
    withCredentials: true
  });

  if (token) {
    // Add authorization header
    clonedReq = clonedReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(clonedReq);
};
