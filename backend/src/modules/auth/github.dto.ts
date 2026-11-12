import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {IsOptional,IsString,Matches,MaxLength,MinLength} from 'class-validator';
import {USERNAME_PATTERN} from '../users/identity';
export class GitHubStatusDto {@ApiProperty() enabled!:boolean;}
export class GitHubStartDto {@ApiPropertyOptional({maxLength:200}) @IsOptional() @IsString() @MaxLength(200) returnTo?:string;}
export class GitHubStartResultDto {@ApiProperty({description:'URL GitHub de navigation volontaire, sans jeton de session JokkoDev.'}) authorizationUrl!:string;}
export class GitHubPendingDto {
 @ApiProperty({enum:['register','link']}) kind!:'register'|'link';
 @ApiProperty({description:'Adresse du compte GitHub contrôlé par ce navigateur, jamais paramètre d’URL.'}) email!:string;
}
export class GitHubRegisterDto {
 @ApiProperty({pattern:USERNAME_PATTERN.source}) @IsString() @Matches(USERNAME_PATTERN) username!:string;
 @ApiProperty({minLength:12,maxLength:128}) @IsString() @MinLength(12) @MaxLength(128) password!:string;
}
export class GitHubLinkDto {@ApiProperty({description:'Mot de passe actuel du compte JokkoDev, jamais mot de passe GitHub.',maxLength:128}) @IsString() @MinLength(1) @MaxLength(128) password!:string;}
