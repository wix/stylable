# Documentation Guidelines

We want to ensure that users have a positive experience with our tools and the documentation is often their first stop. 

## General writing guidelines

1. Be **consistent**! This rule applies even if your text sounds repetitive.

    **Example**: If you call something a **class**, call it a class throughout. Do not use a different term like **selector** for the same thing you called a **class**.

2. Use the active voice whenever possible. Avoid passive.

   **Example of passive**: When a *component is added*.
 
   **Example of active**: When you *add a component*. 

3. Speak directly to our users in 2nd person. Everything we write is a conversation with our users. 

   See examples under #2.  

   This rule does not directly apply to reference docs.

4. Use **present tense**. If you catch yourself writing "will", change it unless you are really writing about the future.

5. Use direct action verbs where possible, especially in guides and procedures.

   **Examples**: Use, Debug, Create

6. When using the words "only" or "just", write them next to the word they are modifying.

   "You can **only style** components." Means you can't add components, import components or any other verb cuz the 'only' is with the verb.
   
   "You can **style only** components." Means you can't style other things, 'only' the components.

7. Avoid using "in order to". You can just write "to" every time.

## Stylable documentation center

Our doc center should be consistent and readable. Please follow these guidelines when writing specifically for the **Stylable** documentation.

### Stylable brand name

We want people to know who we are! So always write with a capital and bold: **Stylable**. Exceptions are when referring to packages or tools including the word **Stylable** that are generally written in lower case or part of a line of code, for example installation instructions.

### Headings

1. Use title caps for all h1 headings. All words in the heading have a capital letter except prepositions (from, to, at, for, etc.) and articles (a, an, the) when they are not the first word in a title. 

    **Example**: Use Stylable to Create a Component Library

2. Use sentence caps for all headings other than h1s. Only the first word in the heading has a capital letter; all other words begin with lower case except proper names (names of things, such as Stylable).

    **Example**: Use Stylable to create a component library

3. Use direct action verbs to tell users what to do. If a reference section, then use simple nouns. Limit the fluff in headings especially.

4. Try not to follow headings with headings. Write some text between headings.

    **Do**: <h2>Use Stylable to create a component library</h2>
            <p>You can create a component library...<p>
            <h3>File structure<h3>

    **Don't**:<h2>Use Stylable to create a component library</h2>
              <h3>File structure<h3>

### Syntax

1. Begin code examples with a comment saying what language the code is in. 

    **Example**:
   ```css
    /* CSS output */
    ```

2. Add comments with clear and very concise annotations on the code.

    **Example**:
    ```css
    /* CSS */
    .mainVideo {
        -st-extends: VideoPlayer; /* define mainVideo as VideoPlayer */
    ```

3. Make sure all code examples follow our own [best practices](./guides/stylable-component-best-practices.md). Sounds obvious, but you'd be surprised ;-). 

### Notes, Warnings, Important

Use these special paragraphs when you want to differentiate content from the rest of a section. Use sparingly because too many get lost and look messy. Some users tend to focus on these and some may skip them altogether; so choose wisely.

#### Format

1. Use blockquotes > to set off every line of the section. 

2. Write the word **Note**, **Warning** or **Important** on the first line by itself in bold, followed by a colon : and two spaces to ensure a separate line.

3. If you are writing about more than one issue, use bullets within the blockquote.

