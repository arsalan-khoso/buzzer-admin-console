import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ICONS_PATH } from '../../common/constants/navigation.constants';
import { httpErrorMessage } from '../../common/utils/http-error.util';
import { AuthService } from '../../core/auth/services/auth.service';
import { HOME_ROUTE, SESSION_EXPIRED_PARAM } from '../constants/auth.constants';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly iconsPath = ICONS_PATH;
  readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly isSubmitting = signal(false);
  readonly isPasswordVisible = signal(false);
  readonly submitted = signal(false);
  readonly errorMessage = signal('');
  readonly sessionExpired =
    this.route.snapshot.queryParamMap.get('reason') === SESSION_EXPIRED_PARAM;

  togglePasswordVisibility(): void {
    this.isPasswordVisible.update((visible) => !visible);
  }

  showError(control: 'email' | 'password'): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || this.submitted());
  }

  submit(): void {
    this.submitted.set(true);
    this.errorMessage.set('');
    if (this.form.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.auth
      .login(this.form.getRawValue())
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl(this.returnUrl()),
        error: (error: unknown) =>
          this.errorMessage.set(
            error instanceof HttpErrorResponse && error.status === 401
              ? 'Incorrect email or password.'
              : httpErrorMessage(error),
          ),
      });
  }

  private returnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl?.startsWith('/') && !returnUrl.startsWith('/login') ? returnUrl : HOME_ROUTE;
  }
}
