import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isGreaterThanOrEqualTo', async: false })
export class IsGreaterThanOrEqualToConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [relatedPropertyName] = args.constraints as [string];
    const relatedValue = (args.object as Record<string, unknown>)[relatedPropertyName];

    if (
      value === undefined ||
      value === null ||
      relatedValue === undefined ||
      relatedValue === null
    ) {
      return true;
    }

    return typeof value === 'number' && typeof relatedValue === 'number' && value >= relatedValue;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints as [string];
    return `${args.property} must be greater than or equal to ${relatedPropertyName}`;
  }
}

export function IsGreaterThanOrEqualTo(
  relatedPropertyName: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol): void => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName.toString(),
      constraints: [relatedPropertyName],
      options: validationOptions,
      validator: IsGreaterThanOrEqualToConstraint,
    });
  };
}
