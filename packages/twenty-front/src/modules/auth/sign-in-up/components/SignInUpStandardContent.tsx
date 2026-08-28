import { Logo } from '@/auth/components/Logo';
import { Title } from '@/auth/components/Title';
import { FooterNote } from '@/auth/sign-in-up/components/FooterNote';
import { WorkspaceSelectionFooter } from '@/auth/sign-in-up/components/WorkspaceSelectionFooter';
import { SignInUpStep } from '@/auth/states/signInUpStepState';
import { styled } from '@linaria/react';
import { type JSX } from 'react';
import { AppPath } from 'twenty-shared/types';
import { AnimatedEaseIn } from 'twenty-ui/layout';
import { ModalContent } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';

// The tenant lockup is 3.5:1, so it cannot use the square Logo slot without
// being cropped or shrunk to a few pixels tall. The sign-in screen is always
// pre-auth, so no workspace member theme exists yet and the system scheme is
// the only signal available for choosing the light or dark artwork.
const StyledTenantLogo = styled.img`
  height: auto;
  margin-top: ${themeCssVariables.spacing[6]};
  width: 180px;

  content: url('/branding/mab-logo-lockup.png');

  @media (prefers-color-scheme: dark) {
    content: url('/branding/mab-logo-lockup-white.png');
  }
`;

const StyledTitleContainer = styled.div`
  line-height: 1.2;
  margin-top: ${themeCssVariables.spacing[10]};
`;

const StyledFormContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  margin-bottom: ${themeCssVariables.spacing[6]};
  margin-top: ${themeCssVariables.spacing[6]};
  min-width: 0;
  width: 100%;
`;

type SignInUpStandardContentProps = {
  signInUpForm: JSX.Element | null;
  signInUpStep: SignInUpStep;
  title: string;
  onClickOnLogo: () => void;
};

export const SignInUpStandardContent = ({
  signInUpForm,
  signInUpStep,
  title,
  onClickOnLogo,
}: SignInUpStandardContentProps) => {
  return (
    <ModalContent isVerticallyCentered isHorizontallyCentered>
      <AnimatedEaseIn>
        <Logo onClick={onClickOnLogo} to={AppPath.SignInUp} />
        <StyledTenantLogo alt="MAB Indus Solutions" />
      </AnimatedEaseIn>
      <StyledTitleContainer>
        <Title animate>{title}</Title>
      </StyledTitleContainer>
      <StyledFormContainer>{signInUpForm}</StyledFormContainer>
      {signInUpStep === SignInUpStep.WorkspaceSelection && (
        <WorkspaceSelectionFooter />
      )}
      {![
        SignInUpStep.Password,
        SignInUpStep.TwoFactorAuthenticationProvision,
        SignInUpStep.TwoFactorAuthenticationVerification,
        SignInUpStep.WorkspaceSelection,
        SignInUpStep.WorkspaceCreation,
      ].includes(signInUpStep) && (
        <FooterNote secondaryAgreement="dataProcessingAgreement" />
      )}
    </ModalContent>
  );
};
