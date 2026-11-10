import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {IsOptional,IsString,Matches,MaxLength,MinLength} from 'class-validator';
import {USERNAME_PATTERN} from '../users/identity';
export class GoogleStatusDto {@ApiProperty() enabled!:boolean;}
export class GoogleStartDto {@ApiPropertyOptional({maxLength:200}) @IsOptional() @IsString() @MaxLength(200) returnTo?:string;}
export class GoogleStartResultDto {@ApiProperty({description:'URL Google de navigation volontaire, sans jeton de session JokkoDev.'}) authorizationUrl!:string;}
export class GooglePendingDto {
 @ApiProperty({enum:['register','link']}) kind!:'register'|'link';
 @ApiProperty({description:'Adresse du compte Google contrôlé par ce navigateur, jamais paramètre d’URL.'}) email!:string;
}
export class GoogleRegisterDto {
 @ApiProperty({pattern:USERNAME_PATTERN.source}) @IsString() @Matches(USERNAME_PATTERN) username!:string;
 @ApiProperty({minLength:12,maxLength:128}) @IsString() @MinLength(12) @MaxLength(128) password!:string;
}
export class GoogleLinkDto {@ApiProperty({description:'Mot de passe actuel du compte JokkoDev, jamais mot de passe Google.',maxLength:128}) @IsString() @MinLength(1) @MaxLength(128) password!:string;}
