import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { USERNAME_PATTERN } from '../../users/identity';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export class RegisterDto {
  @ApiProperty({ example: 'awa@example.com', maxLength: 254 }) @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty({ example: 'awa_dev', pattern: USERNAME_PATTERN.source, description: '3 à 30 caractères : lettres ASCII, chiffres et tiret bas. Unique sans tenir compte de la casse.' }) @IsString() @Matches(USERNAME_PATTERN) username!: string;
  @ApiProperty({ minLength: 12, maxLength: 128, description: 'Espaces autorisés, aucune troncature ni règle de composition.' }) @IsString() @MinLength(12) @MaxLength(128) password!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'awa@example.com', maxLength: 254 }) @IsString() @MaxLength(254) email!: string;
  @ApiProperty({ maxLength: 128 }) @IsString() @MinLength(1) @MaxLength(128) password!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'awa@example.com', maxLength: 254 }) @IsEmail() @MaxLength(254) email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Jeton reçu par email (paramètre token du lien).', pattern: TOKEN_PATTERN.source }) @IsString() @Matches(TOKEN_PATTERN) token!: string;
  @ApiProperty({ minLength: 12, maxLength: 128 }) @IsString() @MinLength(12) @MaxLength(128) password!: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Jeton reçu par email (paramètre token du lien).', pattern: TOKEN_PATTERN.source }) @IsString() @Matches(TOKEN_PATTERN) token!: string;
}

export class CurrentUserDto {
  @ApiProperty({ nullable: true, type: String }) photoUrl!: string | null;
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'awa_dev' }) username!: string;
  @ApiProperty({ example: 'awa@example.com', description: 'Visible uniquement par le titulaire de la session.' }) email!: string;
  @ApiProperty({ enum: ['MEMBER', 'ADMIN'] }) role!: 'MEMBER' | 'ADMIN';
  @ApiProperty({ example: true }) emailVerified!: boolean;
}

export class CsrfTokenDto {
  @ApiProperty({ description: 'À renvoyer dans l’en-tête X-CSRF-Token de toute requête POST, PUT, PATCH ou DELETE.' }) csrfToken!: string;
}

export class AuthResultDto {
  @ApiProperty({ type: CurrentUserDto }) user!: CurrentUserDto;
  @ApiProperty({ description: 'Nouveau jeton CSRF lié à la session créée.' }) csrfToken!: string;
}
