import { anyFieldFilterValueComponentState } from '@/object-record/record-filter/states/anyFieldFilterValueComponentState';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { StyledHeaderDropdownButton } from '@/ui/layout/dropdown/components/StyledHeaderDropdownButton';
import { DROPDOWN_OFFSET_Y } from '@/ui/layout/dropdown/constants/DropdownOffsetY';
import { isDropdownOpenComponentState } from '@/ui/layout/dropdown/states/isDropdownOpenComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { AnyFieldSearchDropdownContent } from '@/views/components/AnyFieldSearchDropdownContent';
import { VIEW_BAR_ANY_FIELD_SEARCH_DROPDOWN_ID } from '@/views/constants/ViewBarAnyFieldSearchDropdownId';
import { Trans } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';

const SEARCH_LABEL_MAX_LENGTH = 20;

export const ViewBarAnyFieldSearchButton = () => {
  const isDropdownOpen = useAtomComponentStateValue(
    isDropdownOpenComponentState,
    VIEW_BAR_ANY_FIELD_SEARCH_DROPDOWN_ID,
  );

  const anyFieldFilterValue = useAtomComponentStateValue(
    anyFieldFilterValueComponentState,
  );

  const hasSearchValue = isNonEmptyString(anyFieldFilterValue);

  const truncatedSearchValue = hasSearchValue
    ? anyFieldFilterValue.length > SEARCH_LABEL_MAX_LENGTH
      ? `${anyFieldFilterValue.slice(0, SEARCH_LABEL_MAX_LENGTH)}…`
      : anyFieldFilterValue
    : '';

  return (
    <Dropdown
      dropdownId={VIEW_BAR_ANY_FIELD_SEARCH_DROPDOWN_ID}
      dropdownOffset={{ y: DROPDOWN_OFFSET_Y, x: 0 }}
      dropdownPlacement="bottom-start"
      clickableComponent={
        <StyledHeaderDropdownButton
          isUnfolded={isDropdownOpen}
          isActive={hasSearchValue}
        >
          {hasSearchValue ? (
            <Trans>Search: {truncatedSearchValue}</Trans>
          ) : (
            <Trans>Search</Trans>
          )}
        </StyledHeaderDropdownButton>
      }
      dropdownComponents={<AnyFieldSearchDropdownContent />}
    />
  );
};
