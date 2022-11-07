# Code standards for the 2030 Next.js app

Each developer that contributes code to the 2030 calculator repo is expected to follow these code standards. This document is the single source of truth on how we write code as a team.

During reviews of pull requests, the reviewer should use this document as a base on how the code should be written.

# Rules to live by

## Use yarn, not npm

Make sure to install everything using `yarn` (v1) to not create a `package-lock.json` by mistake.

## Naming

Naming is important since it makes it easy to scan the codebase and other teammates' code becomes less complex to follow.

### (Pseudo) Constants

For values that are supposed to be immutable constants, use UPPERCASE_SNAKE_CASE

```javascript
// DO 👍
const MAX_LENGTH = 123;

// DON'T
const maxLength = 123;
```

### Strings, numbers, arrays etc

The regular naming for variables is camelCase.

```javascript
// DO 👍
const num = 123;
const happyString = 'All these sea monster jokes are just Kraken me up.';
const allMyFavoriteFoods = [];
```

### Booleans

Booleans should always be prefixed with a verb such as is or has. It makes it easy to differentiate by reading the variables without seeing the declaration.

```javascript
// DO 👍
const [isOn, setIsOn] = useState(false);
const hasDetailedFields = true;
const displayMenu = false;

// DON'T
const [on, setOn] = useState(false);
const detailedFields = true;
const menu = false;
```

### React Components

React Components are written using PascalCase.

```javascript
// DO 👍
const MeaningOfItAll = ({ life }) => 42;

// DON'T
const thisIsWrong = ({ num }) => num;
```

### Functions

Only use arrow functions and name them using camelCase.

```javascript
// DO 👍
const calculateSum = (a: number, b: number) => a + b;

// DON'T
const CalculateSum = (a: number, b: number) => a + b;
const calculatesum = (a: number, b: number) => a + b;
const calculate_sum = (a: number, b: number) => a + b;
```

### Types

All types should end with the word `Type` if general, and `Props` in regards to component props.

```javascript
// DO 👍
type ListItemType = {
  name: string,
};

// DON'T
type ListItem = {
  name: string,
};
```

### Never chain Conditional (ternary) operators

[Ternaries](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Conditional_Operator) are sweet in small doses. Do not chain ternaries.

```javascript
// DO 👍
const color = defaultColor ? 'blue' : 'red';

// DON'T
const color = defaultColor ? 'blue' : prefersLightTones ? 'light-blue' : 'red';
```

More readable solutions for teammates lacking the context are:

```javascript
// Using if/else
// if you know you're only going to chain once
if (defaultColor) {
  color = 'blue';
} else if (prefersLightTones) {
  color = 'light-blue';
} else {
  color = 'red';
}
```

```javascript
// creating a reusable function that takes an argument and returns a value based on that, using switch and cases
const getColor = (colorName: string): string => {
  switch (colorName) {
    case 'red':
      return '#EE6352';
    case 'green':
      return '#59CD90';
    default:
      return '#3FA7D6';
  }
};
```

### Files

For files that are React components, or tests for React components, use PascalCase. For files that returns functions or variables, name them as you would the variable.

```
// DO 👍
/calculation
 - IncrementButton.tsx

// DON'T
/calculation
 - incrementButton.tsx
```

# Writing code

## Only use functional components

We do not write class-based components. A functional component should take needed variables as properties and avoid to do internal calculations for as long as possible. If you have functionality that needs to act on events such as clicks, utilize callbacks.
All components should be as dumb as possible. We keep state external from the component for as long as possible. This means a general component should act as if everything needed is being provided through props. [Example can be found here: ChooseYourFavoriteChocolate.tsx](/examples/ChooseYourFavoriteChocolate.tsx)

```javascript
// DO 👍
const ChooseYourFavoriteChocolate = ({ defaultSelectedChocolate: ChocolateType, onChocolateClick: (chocolate: ChocolateType) => Promise<void> }) => {
  /* code here */
  return (
    theCompleteListsOfChocolatesFetchedFromTheApi.map((chocolate: ChocolateType) => {
      return (
        <div key={chocolate.id} style={{ backgroundColor: defaultSelectedChocolate.id === chocolate.id ? 'green' : 'gray' }}>
          {chocolate.name} <button onClick={() => onChocolateClick(chocolate)}>Select</button>
        </div>
      )
    })
  )
}
```

## Test your code!

### Make sure you have testids for all your interactive components/elements

Interactive components / elements should have a unique property called `data-testid` specified on them. This goes for buttons, links and inputs such as selects. If you're not sure if you should add it, add it. The principle is as follows:

> If your element is the wrapping interactive element, it should have a `data-testid` specified.

`a`, `button` and `select` are all wrapping interactive elements, where an `option` is not (a test will be able to target this by accessing the select).

```html
// DO 👍 <a href="login" data-testid="footer-login-link">Login</a>
```

### Visual testing

If you write visual components (dumb ui components) - you should create [Storybook](https://storybook.js.org) stories in the folder `__stories__` and named as `NameMatchingTheFileToBeTested.stories.ts`.
Write one variant representing each of the different states your component can be in. This is used to communicate regarding the design in larger perspective - the Storybook is public to everyone at Doconomy. You can test your variants by running `yarn storybook` locally.

### Unit testing

Always write unit tests! If you're used to doing TDD, please do, otherwise, write tests that cover the different use cases of your component. Please get in touch with teammates in the shared Slack channel #2030-dev-discussion if you feel lost. We use `jest` and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) to test.

Unit tests are placed in the root folder `__tests__` and named as `NameMatchingTheFileToBeTested.test.ts`.

### Sidenote: How to run the tests

Cypress: To run cypress test start the dev server `yarn dev` then run `yarn cy:run`. Go to the cypress/videos folder to see the video of the test.

## Never use useEffect inside of components - abstract them into custom hooks

`useEffect`s in combination creates a slippery slope where a functional component suddenly ends up in a bowl of spaghetti. To combat these, we encapsulate the functionality into custom hooks. There's a great blog post on how to do this here: [https://kyleshevlin.com/use-encapsulation](https://kyleshevlin.com/use-encapsulation). This will let readers of your code to grasp what you're doing really quick.

[Example can be found here: useChocolates.ts](/examples/useChocolates.ts)

```javascript
// DO 👍
const ChooseYourFavoriteChocolate = ({ defaultSelectedChocolate: ChocolateType, onChocolateClick: (chocolate: ChocolateType) => Promise<void> }) => {
  const [existingChocolates] = useChocolates([])
  return (
    /* code here */
  )
}

// DON'T
const ChooseYourFavoriteChocolate = ({ defaultSelectedChocolate: ChocolateType, onChocolateClick: (chocolate: ChocolateType) => Promise<void> }) => {
  const [existingChocolates, setExistingChocolates] = useState([])
  useEffect(() => {
    if (!existingChocolates) {
      // logic for fetching chocolates and then setting existingChocolates
    }
  }, [existingChocolates])
  return (
    /* code here */
  )
}
```

## Document the usage of the component

Contrary to popular belief, code isn't self documenting. It might be for yourself, but for others, it's good to know straight from the get-go why the code exists. Therefore - we comment each React Component with a JSDoc comment. This will also be used for documentation generation in the future. For a quick starter, check out this blog post: [https://gomakethings.com/documenting-javascript/](https://gomakethings.com/documenting-javascript/). You do not have to document the variables, since you're expected to always create a `Type` for each Component.

```javascript
// DO 👍
/**
 * Let's you share your favorite chocolate with your friends.
 * Utilized to have an easy way to never have to meet your friends, so you can DM them instead.
 */
const ChooseYourFavoriteChocolate = ({ defaultSelectedChocolate: ChocolateType, onChocolateClick: (chocolate: ChocolateType) => Promise<void> }) => {
  const [existingChocolates] = useChocolates([])
  return (
    /* code here */
  )
}
```

## You have to create Types for variables that aren't standard types

We do not create adhoc types or interfaces, only explicit ones.

```javascript
// DO 👍
type ChocolateType {
  name: string
  cocoaPercentage: number
  color: ColorType
}
const chocolate: ChocolateType = {
  name: 'Milk',
  cocoaPercentage: 0.1,
  color: 'LightBrown'
}

// DON'T
const chocolate: {
  name: string
  cocoaPercentage: number
  color: ColorType
} = {
  name: 'Milk',
  cocoaPercentage: 0.1,
  color: 'LightBrown'
}}
```

## Don't use `any`

You're never allowed to use type `any`.

## A function does one thing and one thing only

Functions are written as side-effect free as possible. This means that given the same input, the function should always return the same output. No external dependency or global should affect the output. We break functions into smaller functions as soon as they start to sprawl and become complex. Kyle Shevlin has a great blog post about this kind of encapsulation [https://kyleshevlin.com/encapsulation](https://kyleshevlin.com/encapsulation), (not the same as the one regarding useState/useEffect).

```javascript
// DO 👍
const getExtendedParticipants: ParticipantType[] = (list: VisitorType[]) => {
  const participants = getParticipants(list); // lots of complex logic to know who participated
  const awards = getAwards(); // insanely weird function that calculates awards, but since it's encapsulated it's managable
  return participants.map((participant) => {
    return { ...participant, award: awards[participant.awardId] };
  });
};
```
