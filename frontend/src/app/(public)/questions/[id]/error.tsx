'use client';
import {Container} from '../../../../components/layout/container';
import {ReadError} from '../../../../components/jokkohelp/read-error';
export default function ErrorPage({reset}:{reset:()=>void}){return <Container className="help-detail"><ReadError retry={reset} detail /></Container>;}
