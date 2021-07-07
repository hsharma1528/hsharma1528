## Python Strings:
1. Immutable sequences
2. Can be sliced, indexed or iterated
3. _in_ and _not_ in operators can be used to find an element in a string
4. One line string => ```python a = "Single Line string ' ```
5. Multi line string => ``` ''' Line One 
                              Line Two ''' ```
6. Functions on Strings 
     * Find Length of a string => **len()**  *** escape character (\) not counted
     * **"+"**    => concatenated
     * **"*"**   => replicated
     * **ord()** => codepoint
     * **chr()**  => codepoint to character
     * **list()** => convert list to string
     * **max()**  => character with max codepoint
     * **min()**  => character wint minimum codepoint
     * **index()** => index of giver substring

## String Methods

* capitalize() – changes all string letters to capitals;
* center() – centers the string inside the field of a known length;
* count() – counts the occurrences of a given character;
* join() – joins all items of a tuple/list into one string;
* lower() – converts all the string's letters into lower-case letters;
* lstrip() – removes the white characters from the beginning of the string;
* replace() – replaces a given substring with another;
* rfind() – finds a substring starting from the end of the string;
* rstrip() – removes the trailing white spaces from the end of the string;
* split() – splits the string into a substring using a given delimiter;
* strip() – removes the leading and trailing white spaces;
* swapcase() – swaps the letters' cases (lower to upper and vice versa)
* title() – makes the first letter in each word upper-case;
* upper() – converts all the string's letter into upper-case letters.
 
 ### String content can be determined using the following methods (all of them return Boolean values):

  * endswith() – does the string end with a given substring?
  * isalnum() – does the string consist only of letters and digits?
  * isalpha() – does the string consist only of letters?
  * islower() – does the string consists only of lower-case letters?
  * isspace() – does the string consists only of white spaces?
  * isupper() – does the string consists only of upper-case letters?
  * startswith() – does the string begin with a given substring?
  
 ### String comparision in python 
   Strings can be compared to strings using general comparison operators, but comparing them to numbers gives no reasonable result, because no string can be equal to any number. For example:

  * string == number is always False;
  * string != number is always True;
  * string >= number always raises an exception.
  
### Sorting list of strings
  * function named **sorted()**, creating a new, sorted list;
  * method named **sort()**, which sorts the list
