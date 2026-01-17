"use strict";

/*
 * This library was created for for the WebGL demo project. It contains one function to generate a random value from a
 * Gaussian distribution. The Box-Miller transform is used. The Stack Overflow thread associated with the function below
 * is located at 
 *  https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve 
 */

export {gen_rand_gaussian};


function gen_rand_gaussian(mean, std_dev)
{
    let u = 1 - Math.random();    // Converting [0,1) to (0,1].
    let v = Math.random();
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

    // Transform to the desired mean and standard deviation.
    return z * std_dev + mean;
}